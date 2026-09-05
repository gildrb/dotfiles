"""Run in the pinned Hermes Python environment; no model or live memory access.

HERMES_TEST_MEMO_SOURCE must name the pinned upstream optmem/memo script.
"""
import importlib.util
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import threading
import unittest
from unittest.mock import patch

from hermes_cli import lifecycle, plugins
from tools.hook_output_spill import spill_if_oversized
from agent.turn_context import compose_user_api_content, substitute_api_content
from hermes_state import SessionDB

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("optmem_startup", ROOT / "plugins/optmem-startup/__init__.py")
startup = importlib.util.module_from_spec(spec)
spec.loader.exec_module(startup)


class StartupTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.home = Path(self.tmp.name)
        self.memo = self.home / "memo"
        self.skill = self.home / "skills/optmem/SKILL.md"
        self.skill.parent.mkdir(parents=True)
        shutil.copyfile(ROOT / "skills/optmem/SKILL.md", self.skill)
        self.addCleanup(patch.stopall)
        patch.dict(os.environ, {"HERMES_HOME": str(self.home), "HOME": str(self.home),
                               "HERMES_MEMO": str(self.memo),
                               "MEMORY_DIR": str(self.home / "memory")}).start()
        patch("hermes_constants.get_hermes_home", return_value=self.home).start()
        self.spill = {"enabled": True, "max_chars": 65536}
        patch("tools.hook_output_spill.get_spill_config", return_value=self.spill).start()
        self.command("print('You are awake.')")

    def command(self, body):
        self.memo.write_text("#!" + sys.executable + "\n" + body + "\n")
        self.memo.chmod(0o700)

    def call(self, **kwargs):
        return startup.pre_llm_call(is_first_turn=True, **kwargs)["context"]

    def test_real_native_registration_and_persisted_api_replay(self):
        manager = plugins.PluginManager(scope_key=str(self.home))
        manifest = plugins.PluginManifest(name="optmem-startup", source="user",
                    path=str(ROOT / "plugins/optmem-startup"))
        manager._load_plugin(manifest)
        self.assertTrue(manager.has_hook("pre_llm_call"))
        with patch.object(plugins, "get_plugin_manager", return_value=manager):
            result = lifecycle.invoke_hook("pre_llm_call", is_first_turn=True,
                                           parent_session_id="", session_id="scratch")
        context = result[0]["context"]
        self.assertIn(self.skill.read_text(), context)
        self.assertEqual(spill_if_oversized(context, config=self.spill), context)
        sent = compose_user_api_content("hello", "", context)
        db = SessionDB(db_path=self.home / "state.db")
        try:
            db.create_session("scratch", source="cli")
            db.append_message("scratch", "user", content="hello", api_content=sent)
            replay = db.get_messages_as_conversation("scratch")[0]
            self.assertEqual(replay["content"], "hello")
            for _ in range(2):
                wire = dict(replay)
                substitute_api_content(wire)
                self.assertEqual(wire["content"], sent)
        finally:
            db.close()

    def test_child_and_continuation_never_execute(self):
        with patch.object(startup, "wake_page", side_effect=AssertionError("executed")):
            self.assertIsNone(startup.pre_llm_call(is_first_turn=True, parent_session_id="parent"))
            self.assertIsNone(startup.pre_llm_call(is_first_turn=False))
            self.assertIsNone(startup.pre_llm_call())

    def test_complete_paging_retains_compression(self):
        self.command("import sys\nif len(sys.argv) == 2:\n print('page one')\n print('Not awake yet. Run: ' + __file__ + ' wake 2 7')\nelse:\n assert sys.argv[2:] == ['2', '7']\n print('page two\\nYou are awake.\\nPending compression: nap required')")
        context = self.call()
        self.assertIn("page one", context)
        self.assertIn("page two", context)
        self.assertIn("Pending compression: nap required", context)

    def test_bad_continuations_and_incomplete_output(self):
        for footer in ["wake 2 7; touch /tmp/NO", "wake 3 7", "wake 2 -7", "wake 2 7 extra"]:
            with self.subTest(footer=footer):
                self.command("print('Not awake yet. Run: ' + __file__ + ' " + footer + "')")
                self.assertIn("NOT LOADED", self.call())
        self.command("print('partial')")
        self.assertIn("NOT LOADED", self.call())

    def test_snapshot_change_and_page_bound(self):
        self.command("import sys\np = int(sys.argv[2]) if len(sys.argv) > 2 else 1\nprint('Not awake yet. Run: ' + __file__ + ' wake ' + str(p + 1) + ' ' + str(p))")
        self.assertIn("NOT LOADED", self.call())
        self.command("import sys\np = int(sys.argv[2]) if len(sys.argv) > 2 else 1\nprint('Not awake yet. Run: ' + __file__ + ' wake ' + str(p + 1) + ' 9')")
        self.assertIn("page limit", self.call())

    def test_failures_have_no_secret_traceback(self):
        for body in ["import sys; print('SECRET', file=sys.stderr); sys.exit(2)",
                     "import sys; sys.stdout.buffer.write(b'\\xff')"]:
            self.command(body)
            context = self.call()
            self.assertIn("NOT LOADED", context)
            self.assertNotIn("SECRET", context)
            self.assertNotIn("Traceback", context)
        self.memo.unlink()
        self.assertIn("NOT LOADED", self.call())
        self.skill.unlink()
        self.assertIn("NOT LOADED", self.call())
        os.environ["HERMES_MEMO"] = "memo"
        self.assertIn("NOT LOADED", self.call())

    def test_output_skill_spill_and_time_bounds(self):
        self.command("print('x' * 70000)")
        self.assertIn("NOT LOADED", self.call())
        self.command("print('You are awake.')")
        self.spill["max_chars"] = 50
        self.assertIn("NOT LOADED", self.call())
        self.spill["max_chars"] = 65536
        self.skill.write_text("x" * 70000)
        self.assertIn("NOT LOADED", self.call())
        self.skill.write_text("skill")
        self.command("import time; time.sleep(2)")
        with patch.object(startup, "TIMEOUT", 0.05):
            self.assertIn("deadline", self.call())

    def test_real_pinned_memo_in_scratch(self):
        source = Path(os.environ["HERMES_TEST_MEMO_SOURCE"])
        raw = source.read_text().replace("ME = pretty(__file__)", "ME = " + repr(str(self.memo)))
        self.memo.write_text("#!" + sys.executable + "\n" + raw.split("\n", 1)[1])
        def memo(*args):
            subprocess.run([str(self.memo), *args], check=True, stdout=subprocess.DEVNULL,
                           stderr=subprocess.PIPE, timeout=5)
        memo("init")
        self.assertIn("You are awake.", self.call())
        memo("config", "PART_LINES=1")
        for i in range(3):
            memo("note", "scratch-memory-" + str(i))
        context = self.call()
        for i in range(3):
            self.assertIn("scratch-memory-" + str(i), context)
        self.assertIn("Not awake yet.", context)
        self.assertIn("You are awake.", context)
        self.assertNotIn("NOT LOADED", context)

    def test_native_concurrent_callback_is_fail_open(self):
        manager = plugins.PluginManager(scope_key=str(self.home))
        entered, release = threading.Event(), threading.Event()
        def callback(**kwargs):
            entered.set()
            release.wait(2)
            return {"context": "loaded"}
        ctx = plugins.PluginContext(plugins.PluginManifest(name="fixture"), manager)
        ctx.register_hook("pre_llm_call", callback)
        thread = threading.Thread(target=lambda: manager.invoke_hook("pre_llm_call"))
        try:
            thread.start()
            self.assertTrue(entered.wait(1))
            self.assertEqual(manager.invoke_hook("pre_llm_call"), [])
        finally:
            release.set()
            thread.join(2)


if __name__ == "__main__":
    unittest.main()
