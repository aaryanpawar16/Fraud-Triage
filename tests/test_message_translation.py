import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from common.llm_client import (
    _group_generic_messages_for_anthropic,
    _group_generic_messages_for_ollama,
    _translate_tools_for_anthropic,
    _translate_tools_for_ollama,
)

GENERIC_TOOLS = [
    {"name": "check_velocity", "description": "counts recent transactions", "input_schema": {"type": "object", "properties": {}}}
]

GENERIC_MESSAGES = [
    {"role": "user", "content": "hello"},
    {
        "role": "assistant",
        "content": "",
        "tool_calls": [
            {"id": "c1", "name": "check_velocity", "input": {"window_minutes": 30}},
            {"id": "c2", "name": "check_geo_mismatch", "input": {}},
        ],
    },
    {"role": "tool_result", "tool_use_id": "c1", "name": "check_velocity", "content": "{\"high_velocity\": true}"},
    {"role": "tool_result", "tool_use_id": "c2", "name": "check_geo_mismatch", "content": "{\"mismatch_vs_typical\": true}"},
    {"role": "user", "content": "continue"},
]


def test_anthropic_translation_groups_consecutive_tool_results_into_one_user_message():
    out = _group_generic_messages_for_anthropic(GENERIC_MESSAGES)

    assert out[0] == {"role": "user", "content": "hello"}

    assistant = out[1]
    assert assistant["role"] == "assistant"
    tool_use_blocks = [b for b in assistant["content"] if b["type"] == "tool_use"]
    assert len(tool_use_blocks) == 2
    assert tool_use_blocks[0]["id"] == "c1"

    grouped = out[2]
    assert grouped["role"] == "user"
    assert len(grouped["content"]) == 2
    assert all(b["type"] == "tool_result" for b in grouped["content"])
    assert grouped["content"][0]["tool_use_id"] == "c1"
    assert grouped["content"][1]["tool_use_id"] == "c2"

    assert out[3] == {"role": "user", "content": "continue"}
    assert len(out) == 4


def test_ollama_translation_keeps_tool_results_as_separate_messages():
    out = _group_generic_messages_for_ollama(GENERIC_MESSAGES)

    assistant = out[1]
    assert assistant["role"] == "assistant"
    assert assistant["tool_calls"][0]["function"]["name"] == "check_velocity"
    assert assistant["tool_calls"][0]["function"]["arguments"] == {"window_minutes": 30}

    assert out[2]["role"] == "tool"
    assert out[2]["content"] == "{\"high_velocity\": true}"
    assert out[3]["role"] == "tool"
    assert out[3]["content"] == "{\"mismatch_vs_typical\": true}"
    assert len(out) == 5


def test_tool_definition_translation_anthropic_passthrough_shape():
    out = _translate_tools_for_anthropic(GENERIC_TOOLS)
    assert out[0]["name"] == "check_velocity"
    assert out[0]["input_schema"] == GENERIC_TOOLS[0]["input_schema"]


def test_tool_definition_translation_ollama_wraps_in_function_type():
    out = _translate_tools_for_ollama(GENERIC_TOOLS)
    assert out[0]["type"] == "function"
    assert out[0]["function"]["name"] == "check_velocity"
    assert out[0]["function"]["parameters"] == GENERIC_TOOLS[0]["input_schema"]


def test_empty_tools_translate_to_none_for_both_providers():
    assert _translate_tools_for_anthropic(None) is None
    assert _translate_tools_for_anthropic([]) is None
    assert _translate_tools_for_ollama(None) is None
    assert _translate_tools_for_ollama([]) is None


if __name__ == "__main__":
    import traceback

    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_")]
    passed, failed = 0, 0
    for t in tests:
        try:
            t()
            print("PASS  " + t.__name__)
            passed += 1
        except AssertionError:
            print("FAIL  " + t.__name__)
            traceback.print_exc()
            failed += 1
    print("\n" + str(passed) + " passed, " + str(failed) + " failed")
    sys.exit(1 if failed else 0)
