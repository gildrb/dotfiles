"""Integration tests: every search runs the actual pinned FFF binary."""
import json
from pathlib import Path
import tempfile
import time
import unittest

from server import Router, MAX_ROOTS


class FffIntegration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.router = Router()
        cls.temp = tempfile.TemporaryDirectory(prefix="fff-test-")
        cls.root = Path(cls.temp.name)
        (cls.root / "alpha.py").write_text("def CacheProbeAlpha():\n    return 'CacheProbeBeta'\n")
        (cls.root / "notes.txt").write_text("CacheProbeBeta\n")

    @classmethod
    def tearDownClass(cls):
        cls.router.close()
        cls.temp.cleanup()

    def call(self, name, root=None, **arguments):
        return self.router.dispatch({"method": "tools/call", "params": {
            "name": name, "arguments": {"root": str(root or self.root), **arguments},
        }})

    def test_01_discovery_stable(self):
        first = self.router.dispatch({"method": "tools/list"})
        self.assertEqual({t["name"] for t in first["tools"]}, {"grep", "multi_grep", "find_files"})
        for tool in first["tools"]:
            self.assertIn("root", tool["inputSchema"]["required"])
        self.assertEqual(first, self.router.dispatch({"method": "tools/list"}))

    def test_02_grep_and_warm_process_reuse(self):
        response = self.call("grep", query="CacheProbeAlpha")
        self.assertFalse(response.get("isError"), response)
        self.assertIn("alpha.py", json.dumps(response))
        pid = self.router.backend(str(self.root)).process.pid
        response = self.call("grep", query="CacheProbeBeta")
        self.assertIn("notes.txt", json.dumps(response))
        self.assertEqual(pid, self.router.backend(str(self.root)).process.pid)

    def test_03_multi_grep_and_find_files(self):
        response = self.call("multi_grep", patterns=["CacheProbeAlpha", "CacheProbeBeta"], constraints="*.py")
        self.assertFalse(response.get("isError"), response)
        self.assertIn("alpha.py", json.dumps(response))
        self.assertNotIn("notes.txt", json.dumps(response))
        response = self.call("find_files", query="alpha")
        self.assertIn("alpha.py", json.dumps(response))

    def test_04_invalid_roots_and_tools(self):
        for root in ["relative", "/", str(Path.home()), "/missing-fff-test-dir", str(self.root / "alpha.py")]:
            response = self.call("grep", root=root, query="anything")
            self.assertTrue(response.get("isError"), response)
        self.assertTrue(self.call("not_a_tool", query="x").get("isError"))

    def test_05_watcher_refresh(self):
        self.call("grep", query="CacheProbeAlpha")
        changed = self.root / "new-file.txt"
        changed.write_text("WatcherUniqueProbe\n")
        deadline = time.monotonic() + 10
        response = {}
        while time.monotonic() < deadline:
            response = self.call("grep", query="WatcherUniqueProbe")
            if "new-file.txt" in json.dumps(response):
                return
            time.sleep(0.1)
        self.fail(f"FFF watcher did not expose new file: {response}")

    def test_06_restarts_dead_backend(self):
        backend = self.router.backend(str(self.root))
        pid = backend.process.pid
        backend.process.kill()
        backend.process.wait()
        response = self.call("grep", query="CacheProbeAlpha")
        self.assertIn("alpha.py", json.dumps(response))
        self.assertNotEqual(pid, self.router.backend(str(self.root)).process.pid)

    def test_07_root_pool_bounded_and_isolated(self):
        first_backend = None
        root = self.root
        for number in range(MAX_ROOTS + 1):
            root = self.root / f"project-{number}"
            root.mkdir()
            (root / "unique.txt").write_text(f"UniqueRootProbe{number}\n")
            response = self.call("grep", root=root, query=f"UniqueRootProbe{number}")
            self.assertIn("unique.txt", json.dumps(response))
            self.assertLessEqual(len(self.router.backends), MAX_ROOTS)
            if number == 0:
                first_backend = self.router.backend(str(root))
        assert first_backend is not None
        self.assertIsNotNone(first_backend.process.poll())
        response = self.call("grep", root=root, query="CacheProbeAlpha")
        self.assertNotIn("alpha.py", json.dumps(response))


if __name__ == "__main__":
    unittest.main()
