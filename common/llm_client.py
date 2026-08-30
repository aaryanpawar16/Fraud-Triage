"""
A thin, swappable LLM client so baseline/run_baseline.py and
agent/run_agent.py don't care whether they're talking to Anthropic,
Ollama, or a deterministic stand-in.

Callers build messages in a PROVIDER-AGNOSTIC shape:
  {"role": "user", "content": "<string>"}
  {"role": "assistant", "content": "<string, may be empty>", "tool_calls": [{"id","name","input"}, ...]}  # tool_calls omitted if none
  {"role": "tool_result", "tool_use_id": "...", "name": "...", "content": "<string>"}

Each client's complete() translates this generic shape into whatever
wire format that provider actually needs, right before sending. This
split exists because it was originally missing: the first version of
this file baked Anthropic's specific tool_use/tool_result block
structure directly into agent/run_agent.py's tool loop, which worked
fine until a second provider (Ollama) was needed and the coupling
became a real refactor instead of a config flag. See
docs/CHANGELOG.md.
"""

from __future__ import annotations
import json
import os
from dataclasses import dataclass
from typing import Any, Callable


@dataclass
class LLMResponse:
    text: str
    tool_calls: list[dict] | None = None


def _group_generic_messages_for_anthropic(messages: list[dict]) -> list[dict]:
    """Translate the generic message list into Anthropic's required
    shape: assistant tool_use blocks, and consecutive tool_result
    entries collapsed into a single user message with tool_result
    blocks first (Anthropic rejects any other order)."""
    out: list[dict] = []
    i = 0
    while i < len(messages):
        m = messages[i]
        if m["role"] == "user":
            out.append({"role": "user", "content": m["content"]})
            i += 1
        elif m["role"] == "assistant":
            content = []
            if m.get("content"):
                content.append({"type": "text", "text": m["content"]})
            for call in m.get("tool_calls", []) or []:
                content.append(
                    {"type": "tool_use", "id": call["id"], "name": call["name"], "input": call["input"]}
                )
            out.append({"role": "assistant", "content": content})
            i += 1
        elif m["role"] == "tool_result":
            blocks = []
            while i < len(messages) and messages[i]["role"] == "tool_result":
                blocks.append(
                    {
                        "type": "tool_result",
                        "tool_use_id": messages[i]["tool_use_id"],
                        "content": messages[i]["content"],
                    }
                )
                i += 1
            out.append({"role": "user", "content": blocks})
        else:
            raise ValueError(f"unknown role in generic message: {m['role']}")
    return out


def _translate_tools_for_anthropic(tools: list[dict] | None) -> list[dict] | None:
    if not tools:
        return None
    return [{"name": t["name"], "description": t["description"], "input_schema": t["input_schema"]} for t in tools]


def _translate_tools_for_ollama(tools: list[dict] | None) -> list[dict] | None:
    """Anthropic-shaped tool defs -> OpenAI/Ollama-shaped tool defs."""
    if not tools:
        return None
    return [
        {
            "type": "function",
            "function": {
                "name": t["name"],
                "description": t["description"],
                "parameters": t["input_schema"],
            },
        }
        for t in tools
    ]


def _group_generic_messages_for_ollama(messages: list[dict]) -> list[dict]:
    """Translate the generic message list into Ollama's shape: plain
    role/content, with assistant tool_calls in OpenAI-style
    {"function": {"name", "arguments"}} form, and each tool result as
    its own separate {"role": "tool"} message (no grouping needed —
    unlike Anthropic, Ollama does not require tool results to be
    batched into a single message)."""
    out: list[dict] = []
    for m in messages:
        if m["role"] == "user":
            out.append({"role": "user", "content": m["content"]})
        elif m["role"] == "assistant":
            entry: dict[str, Any] = {"role": "assistant", "content": m.get("content") or ""}
            if m.get("tool_calls"):
                entry["tool_calls"] = [
                    {"function": {"name": c["name"], "arguments": c["input"]}} for c in m["tool_calls"]
                ]
            out.append(entry)
        elif m["role"] == "tool_result":
            out.append(
                {"role": "tool", "content": m["content"], "name": m.get("name", "")}
            )
        else:
            raise ValueError(f"unknown role in generic message: {m['role']}")
    return out


class RealAnthropicClient:
    """Wraps the Anthropic Messages API. Requires ANTHROPIC_API_KEY."""

    def __init__(self, model: str | None = None):
        try:
            import anthropic
        except ImportError as e:
            raise RuntimeError("pip install anthropic (see requirements.txt)") from e

        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            raise RuntimeError(
                "ANTHROPIC_API_KEY is not set. Export it before running — "
                "see docs/REPRODUCTION.md. Never hardcode it in source."
            )
        self._client = anthropic.Anthropic(api_key=api_key)
        self._model = model or os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-5")

    def complete(
        self,
        system: str,
        messages: list[dict],
        tools: list[dict] | None = None,
        max_tokens: int = 1024,
    ) -> LLMResponse:
        kwargs: dict[str, Any] = {
            "model": self._model,
            "max_tokens": max_tokens,
            "system": system,
            "messages": _group_generic_messages_for_anthropic(messages),
        }
        translated_tools = _translate_tools_for_anthropic(tools)
        if translated_tools:
            kwargs["tools"] = translated_tools

        resp = self._client.messages.create(**kwargs)

        text_parts = []
        tool_calls = []
        for block in resp.content:
            if block.type == "text":
                text_parts.append(block.text)
            elif block.type == "tool_use":
                tool_calls.append({"id": block.id, "name": block.name, "input": block.input})

        return LLMResponse(text="".join(text_parts), tool_calls=tool_calls or None)


class OllamaClient:
    """Wraps a local Ollama instance via the `ollama` Python package.

    Requires Ollama running locally (default http://localhost:11434)
    and a tool-calling-capable model already pulled, e.g.:
        ollama pull llama3.1
    Not every Ollama model supports tool use — check the model's page
    on ollama.com for the "tools" capability badge before picking one.
    """

    def __init__(self, model: str | None = None, host: str | None = None):
        try:
            import ollama
        except ImportError as e:
            raise RuntimeError("pip install ollama (see requirements.txt)") from e

        self._ollama = ollama
        self._model = model or os.environ.get("OLLAMA_MODEL", "llama3.1")
        host = host or os.environ.get("OLLAMA_HOST", "http://localhost:11434")
        self._client = ollama.Client(host=host)

    def complete(
        self,
        system: str,
        messages: list[dict],
        tools: list[dict] | None = None,
        max_tokens: int = 1024,
    ) -> LLMResponse:
        ollama_messages = [{"role": "system", "content": system}] + _group_generic_messages_for_ollama(messages)
        kwargs: dict[str, Any] = {"model": self._model, "messages": ollama_messages}
        translated_tools = _translate_tools_for_ollama(tools)
        if translated_tools:
            kwargs["tools"] = translated_tools

        resp = self._client.chat(**kwargs)

        text = resp.message.content or ""
        tool_calls = None
        if resp.message.tool_calls:
            tool_calls = [
                {
                    # Ollama doesn't hand back a call id the way Anthropic
                    # does — synthesize one so the rest of the pipeline
                    # (which matches results back to calls by id) works
                    # unchanged regardless of provider.
                    "id": f"ollama_call_{i}",
                    "name": c.function.name,
                    "input": dict(c.function.arguments),
                }
                for i, c in enumerate(resp.message.tool_calls)
            ]

        return LLMResponse(text=text, tool_calls=tool_calls)


class MockClient:
    """Deterministic stand-in for testing the harness mechanics only.
    Operates on the same generic message shape as the real clients —
    it never sees provider-specific wire format, by design."""

    def __init__(self, responder: Callable[[str, list[dict]], LLMResponse]):
        self._responder = responder
        self.call_log: list[dict] = []

    def complete(
        self,
        system: str,
        messages: list[dict],
        tools: list[dict] | None = None,
        max_tokens: int = 1024,
    ) -> LLMResponse:
        self.call_log.append({"system": system, "messages": messages, "tools": tools})
        return self._responder(system, messages)


def get_client():
    """Picks a client based on LLM_PROVIDER (default: anthropic)."""
    provider = os.environ.get("LLM_PROVIDER", "anthropic").lower()
    if provider == "ollama":
        return OllamaClient()
    if provider == "anthropic":
        return RealAnthropicClient()
    raise RuntimeError(f"Unknown LLM_PROVIDER: {provider!r} (expected 'anthropic' or 'ollama')")


def parse_json_block(text: str) -> dict:
    """Model responses are asked to end with a fenced JSON block.
    Pulls it out and parses it, raising clearly if the model didn't
    follow the format rather than silently returning garbage."""
    start = text.find("```json")
    if start == -1:
        start = text.find("{")
        end = text.rfind("}")
        if start == -1 or end == -1:
            raise ValueError(f"No JSON object found in model output: {text!r}")
        return json.loads(text[start : end + 1])

    start = text.find("{", start)
    end = text.rfind("}")
    return json.loads(text[start : end + 1])
