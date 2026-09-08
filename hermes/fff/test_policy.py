"""Run with installed Hermes Python; isolated profile, real plugin discovery."""
import os
from pathlib import Path
import shutil
import tempfile
import unittest

PROFILE = tempfile.TemporaryDirectory(prefix="hermes-fff-policy-")
os.environ["HERMES_HOME"] = PROFILE.name
home = Path(PROFILE.name)
shutil.copytree(Path(__file__).resolve().parents[1] / "plugins/optmem-startup",
                home / "plugins/optmem-startup", ignore=shutil.ignore_patterns("__pycache__"))
(home / "config.yaml").write_text("plugins:\n  enabled: [optmem-startup]\n")
from hermes_cli.plugins import _dispatch_pre_tool_call_hooks, discover_plugins

discover_plugins()

class PolicyTest(unittest.TestCase):
    def blocked(self, tool, args):
        message, modified = _dispatch_pre_tool_call_hooks(tool, args)
        self.assertIsNone(modified)
        self.assertIn("FFF_REQUIRED", message or "")

    def test_search_tool(self):
        self.blocked("search_files", {"pattern": "needle", "path": "/tmp"})

    def test_shell_searches(self):
        for command in ["rg needle .", "/bin/grep -R needle /tmp", "find . -name '*.py'",
                        "fd config", "ls -la", "git grep needle", "env LC_ALL=C rg x .",
                        "printf x | grep x", "bash -lc 'rg x .'", 'sh -c "find ."',
                        "python3 -c 'import os; print(list(os.walk(\".\")))'",
                        "rg 'unterminated"]:
            with self.subTest(command=command):
                self.blocked("terminal", {"command": command})

    def test_allowed(self):
        for tool, args in [("read_file", {"path": "/tmp/x"}),
                           ("web_search", {"query": "test"}),
                           ("session_search", {"query": "test"}),
                           ("terminal", {"command": '"$HERMES_MEMO" recall test'}),
                           ("terminal", {"command": "git status --short"}),
                           ("terminal", {"command": "python3 -m unittest -v test_policy"}),
                           ("mcp__fff__grep", {"root": "/tmp", "query": "test"}),
                           ("mcp__fff__multi_grep", {}), ("mcp__fff__find_files", {})]:
            with self.subTest(tool=tool, args=args):
                self.assertEqual(_dispatch_pre_tool_call_hooks(tool, args), (None, None))

if __name__ == "__main__":
    unittest.main()
