"""FFF search guard, independent of OptMem wake and memory state.

This is a normal-tool-use guard, not an arbitrary-code security sandbox.
Hermes native plugin loading and hook exceptions fail open.
"""
import re
import shlex
from pathlib import PurePosixPath

MESSAGE = ("FFF_REQUIRED: filesystem content and filename searches must use "
           "mcp__fff__grep, mcp__fff__multi_grep or mcp__fff__find_files with an "
           "absolute root. Discover deferred tools with tool_search if needed. "
           "Do not fall back to another search engine if FFF fails; report the error. "
           "Direct file reads, web search and session/memory search are separate.")
SEARCH_TOOLS = frozenset({"search_files", "grep", "file_search", "find_files"})
# Search engines only. Listing a known directory (ls, tree) is not a search.
SEARCH_COMMANDS = frozenset({"grep", "egrep", "fgrep", "rg", "ripgrep", "ag", "ack",
                             "find", "fd", "fdfind", "locate", "mlocate", "plocate"})
# Prefixes that run their argument as the next command.
WRAPPERS = frozenset({"sudo", "doas", "env", "xargs", "time", "nice", "nohup", "command",
                      "exec", "stdbuf", "timeout", "watch", "parallel"})
SEPARATORS = frozenset({";", "&", "&&", "|", "||", "(", ")", "|&", ";;"})
SHELLS = frozenset({"sh", "bash", "dash", "zsh"})
# Common explicit interpreter search escapes, without banning interpreters.
CODE_SEARCH = re.compile(r"\b(?:os\.(?:walk|listdir|scandir)|glob\.(?:glob|iglob)|\.(?:rglob|glob)\s*\()")
ASSIGNMENT = re.compile(r"[A-Za-z_][A-Za-z0-9_]*=")
STDIN_FILTERS = frozenset({"grep", "egrep", "fgrep", "rg", "ripgrep", "ag", "ack"})


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
    at_command = True
    wrapped = False  # Wrapper options/values vary; check all its words.
    piped = False  # A text filter on another command's output is not a file search.
    for index, token in enumerate(tokens):
        if token in SEPARATORS or token.endswith("$"):
            at_command, wrapped = True, False  # "$(" lexes as "$", "(".
            piped = token in {"|", "|&"}
            continue
        if token.startswith("`"):
            at_command, wrapped = True, False
        name = PurePosixPath(token.lstrip("`")).name
        if wrapped and name in SEARCH_COMMANDS:
            return True
        if not at_command:
            continue
        if name in WRAPPERS:
            wrapped = True
            continue
        if ASSIGNMENT.match(token):
            continue
        at_command = False
        if name in SEARCH_COMMANDS and not (piped and name in STDIN_FILTERS):
            return True
        if name == "git" and index + 1 < len(tokens) and tokens[index + 1] in {"grep", "ls-files", "ls-tree"}:
            return True
        if name in SHELLS:
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
