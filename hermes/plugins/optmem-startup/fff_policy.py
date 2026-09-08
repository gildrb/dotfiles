"""FFF search guard, independent of OptMem wake and memory state.

This is a normal-tool-use guard, not an arbitrary-code security sandbox.
Hermes native plugin loading and hook exceptions fail open.
"""
import re
import shlex
from pathlib import PurePosixPath

MESSAGE = ("FFF_REQUIRED: filesystem content and filename searches must use "
           "mcp__fff__grep, mcp__fff__multi_grep or mcp__fff__find_files with an "
           "absolute root. Load their schemas with tool_describe if needed. "
           "Do not fall back to another search engine if FFF fails; report the error. "
           "Direct file reads, web search and session/memory search are separate.")
SEARCH_TOOLS = frozenset({"search_files", "grep", "file_search", "find_files"})
SEARCH_COMMANDS = frozenset({"grep", "egrep", "fgrep", "rg", "ripgrep", "ag", "ack",
                             "find", "fd", "fdfind", "locate", "mlocate", "plocate", "ls", "tree"})
# Common explicit interpreter search escapes, without banning interpreters.
CODE_SEARCH = re.compile(r"\b(?:os\.(?:walk|listdir|scandir)|glob\.(?:glob|iglob)|\.(?:rglob|glob)\s*\()")


def shell_search(command, depth=0):
    if not isinstance(command, str) or depth > 8:
        return True
    if CODE_SEARCH.search(command):
        return True
    try:
        lexer = shlex.shlex(command, posix=True, punctuation_chars=";&|()<>")
        lexer.whitespace_split = True
        tokens = list(lexer)
    except ValueError:
        return True  # Refuse unparseable shell rather than silently bypassing.
    for index, token in enumerate(tokens):
        name = PurePosixPath(token).name
        # Conservative: also catches wrappers (sudo/env/xargs), pipes and substitutions.
        if name in SEARCH_COMMANDS:
            return True
        if name == "git" and index + 1 < len(tokens) and tokens[index + 1] in {"grep", "ls-files", "ls-tree"}:
            return True
        if name in {"sh", "bash", "dash", "zsh"}:
            for offset in range(index + 1, min(index + 4, len(tokens) - 1)):
                if tokens[offset].startswith("-") and "c" in tokens[offset]:
                    if shell_search(tokens[offset + 1], depth + 1):
                        return True
    return False


def pre_tool_call(*, tool_name="", args=None, **kwargs):
    name = tool_name.removeprefix("functions.")
    arguments = args if isinstance(args, dict) else {}
    if name in SEARCH_TOOLS or (name == "terminal" and shell_search(arguments.get("command"))):
        return {"action": "block", "message": MESSAGE}
    return None
