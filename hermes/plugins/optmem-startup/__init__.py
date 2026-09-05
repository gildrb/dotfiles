"""Load isolated OptMem on the first top-level turn (native hooks fail open)."""

import os
from pathlib import Path
import re
import selectors
import signal
import subprocess
import time

MAX_BYTES = 60000
MAX_PAGES = 8
TIMEOUT = 8.0


class StartupFailure(Exception):
    """A fixed diagnostic safe to include in model context."""


def wake_page(argv, deadline, budget):
    """Read bounded stdout; never run instructions printed by memo."""
    with subprocess.Popen(argv, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                          start_new_session=True) as process:
        try:
            output = bytearray()
            with selectors.DefaultSelector() as selector:
                selector.register(process.stdout, selectors.EVENT_READ)
                while True:
                    remaining = deadline - time.monotonic()
                    if remaining <= 0 or not selector.select(remaining):
                        raise StartupFailure("wake deadline exceeded")
                    chunk = os.read(process.stdout.fileno(), min(4096, budget + 1))
                    if not chunk:
                        break
                    output.extend(chunk)
                    budget -= len(chunk)
                    if budget < 0:
                        raise StartupFailure("startup output limit exceeded")
            if process.wait(timeout=max(0.001, deadline - time.monotonic())):
                raise StartupFailure("wake failed; memory may need initialization or compression")
            return output.decode("utf-8")
        finally:
            # Kill the process group, including descendants that kept stdout open.
            try:
                os.killpg(process.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass


def pre_llm_call(*, is_first_turn=False, parent_session_id=None, **kwargs):
    if not is_first_turn or parent_session_id:
        return None
    try:
        from hermes_constants import get_hermes_home
        from tools.hook_output_spill import get_spill_config

        memo = os.environ.get("HERMES_MEMO", "")
        if not Path(memo).is_absolute():
            raise StartupFailure("absolute HERMES_MEMO is unavailable")
        spill = get_spill_config()
        budget = min(MAX_BYTES, spill["max_chars"]) if spill["enabled"] else MAX_BYTES
        skill_path = Path(get_hermes_home()) / "skills/optmem/SKILL.md"
        with skill_path.open("rb") as file:
            skill = file.read(budget + 1)
        if not skill.strip() or len(skill) > budget:
            raise StartupFailure("OptMem skill is empty or exceeds startup limit")
        context = ("OptMem startup: complete skill and wake output below. "
                   "Do not rerun wake. Follow any pending compression instructions "
                   "before other work.\n\n" + skill.decode("utf-8") + "\n\n")
        deadline = time.monotonic() + TIMEOUT
        args = []
        snapshot = None
        for page in range(1, MAX_PAGES + 1):
            remaining = budget - len(context.encode("utf-8"))
            if remaining <= 0:
                raise StartupFailure("startup output limit exceeded")
            output = wake_page([memo, "wake", *args], deadline, remaining)
            context += output
            lines = output.splitlines()
            continuations = [line for line in lines if line.startswith("Not awake yet.")]
            if continuations:
                match = re.fullmatch(re.escape("Not awake yet. Run: " + memo)
                                     + r" wake ([1-9][0-9]{0,9}) ([0-9]{1,20})",
                                     lines[-1])
                if (len(continuations) != 1 or not match
                        or int(match[1]) != page + 1
                        or (snapshot is not None and match[2] != snapshot)):
                    raise StartupFailure("invalid wake continuation")
                snapshot = match[2]
                args = [match[1], snapshot]
            elif "You are awake." in lines:
                return {"context": context}
            else:
                raise StartupFailure("wake did not confirm completion")
        raise StartupFailure("wake page limit exceeded")
    except StartupFailure as error:
        reason = str(error)
    except Exception:
        reason = "startup command or skill unavailable"
    return {"context": "OptMem NOT LOADED: " + reason + ". Report this failure; "
            "do not claim memory loaded or initialize a store. Use only HERMES_MEMO "
            "for recovery. Native startup hooks fail open; this is not a hard gate."}


def register(ctx):
    ctx.register_hook("pre_llm_call", pre_llm_call)
