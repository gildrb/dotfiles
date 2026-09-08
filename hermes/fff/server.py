"""Local stdio MCP adapter: upstream FFF searches, bounded warm root pool.

Only routes JSON-RPC; it does not implement a second search engine. Python stdlib.
"""
import atexit
from collections import OrderedDict
import json
import os
from pathlib import Path
import queue
import signal
import subprocess
import sys
import tempfile
import threading

BINARY = os.environ.get("FFF_MCP_BINARY", "fff-mcp")
MAX_ROOTS = 4
TIMEOUT = 90


class Backend:
    def __init__(self, root):
        self.process = subprocess.Popen(
            [BINARY, str(root), "--no-update-check", "--log-level", "error",
             "--max-cached-files", "2048", "--idle-timeout-secs", "86400"],
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=sys.stderr,
            text=True, bufsize=1,
        )
        assert self.process.stdin is not None and self.process.stdout is not None
        self.stdin = self.process.stdin
        self.stdout = self.process.stdout
        self.inbox = queue.Queue()
        self.sequence = 0
        threading.Thread(target=self._read, daemon=True).start()
        try:
            self.info = self.call("initialize", {
                "protocolVersion": "2024-11-05", "capabilities": {},
                "clientInfo": {"name": "hermes-fff-router", "version": "1.0.0"},
            })
            self.send({"jsonrpc": "2.0", "method": "notifications/initialized"})
        except BaseException:
            self.close()
            raise

    def _read(self):
        try:
            for line in self.stdout:
                try:
                    self.inbox.put(json.loads(line))
                except json.JSONDecodeError:
                    self.inbox.put(None)
                    return
        finally:
            self.inbox.put(None)

    def send(self, payload):
        self.stdin.write(json.dumps(payload) + "\n")
        self.stdin.flush()

    def call(self, method, params):
        self.sequence += 1
        request_id = self.sequence
        self.send({"jsonrpc": "2.0", "id": request_id,
                   "method": method, "params": params})
        # Upstream FFF does not make server-initiated requests. Notifications
        # may precede responses; a fixed deadline prevents an endless wait.
        import time
        deadline = time.monotonic() + TIMEOUT
        while True:
            response = self.inbox.get(timeout=max(0.001, deadline - time.monotonic()))
            if response is None:
                raise RuntimeError("FFF closed its connection or sent invalid JSON")
            if response.get("id") != request_id:
                if time.monotonic() >= deadline:
                    raise TimeoutError("FFF response deadline exceeded")
                continue
            if "error" in response:
                raise RuntimeError(str(response["error"]))
            return response["result"]

    def close(self):
        if self.process.poll() is None:
            self.process.terminate()
            try:
                self.process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.process.kill()
                self.process.wait()
        self.stdin.close()
        self.stdout.close()


class Router:
    def __init__(self):
        self.backends = OrderedDict()
        # Discover the pinned upstream schemas against an empty directory:
        # startup must not scan HOME, repositories, or assistant memories.
        with tempfile.TemporaryDirectory(prefix="hermes-fff-schema-") as root:
            backend = Backend(root)
            try:
                self.tools = backend.call("tools/list", {})["tools"]
            finally:
                backend.close()
        for tool in self.tools:
            schema = tool["inputSchema"]
            schema["properties"]["root"] = {
                "type": "string",
                "description": "Absolute directory to search. FFF may expand to its Git repository root. Reuse the same root and cursor for pagination.",
            }
            schema["required"] = [*schema.get("required", []), "root"]
            tool["description"] = "Use FFF for file search. " + tool["description"]
        self.names = {tool["name"] for tool in self.tools}
        atexit.register(self.close)

    def close(self):
        for backend in self.backends.values():
            backend.close()
        self.backends.clear()

    def backend(self, root):
        if not isinstance(root, str) or not Path(root).is_absolute():
            raise ValueError("root must be an absolute directory path")
        path = Path(root).resolve(strict=True)
        if not path.is_dir():
            raise ValueError("root must be a directory")
        if path in (Path("/"), Path.home()):
            raise ValueError("Choose a specific directory, not / or HOME")
        key = str(path)
        backend = self.backends.pop(key, None)
        if backend is not None and backend.process.poll() is not None:
            backend.close()
            backend = None
        if backend is None:
            if len(self.backends) >= MAX_ROOTS:
                _, evicted = self.backends.popitem(last=False)
                evicted.close()
            backend = Backend(path)
        self.backends[key] = backend
        return backend

    def call_tool(self, params):
        name = params.get("name")
        if name not in self.names:
            raise ValueError("Unknown FFF tool")
        arguments = dict(params.get("arguments", {}))
        root = arguments.pop("root", None)
        backend = self.backend(root)
        try:
            return backend.call("tools/call", {"name": name, "arguments": arguments})
        except Exception:
            # Do not reuse a timed-out protocol stream or stale response.
            key = str(Path(root).resolve())
            self.backends.pop(key, None)
            backend.close()
            raise

    def dispatch(self, message):
        method = message.get("method")
        if method == "initialize":
            return {
                "protocolVersion": message.get("params", {}).get("protocolVersion", "2024-11-05"),
                "capabilities": {"tools": {}},
                "serverInfo": {"name": "hermes-fff", "version": "1.0.0"},
                "instructions": "Use FFF grep for file-content searches, multi_grep for OR batches, find_files for filenames. Always specify an absolute root. Use small maxResults and cursors. Constraints: grep query '*.py identifier'; multi_grep constraints '*.py'. Searches honor FFF exclusions; no match is not proof about ignored files. Read exact files with read_file. Warm indexes are local search caches, not model prompt caches.",
            }
        if method == "ping":
            return {}
        if method == "tools/list":
            return {"tools": self.tools}
        if method == "tools/call":
            try:
                return self.call_tool(message.get("params", {}))
            except Exception as error:
                return {"isError": True, "content": [{"type": "text", "text": f"FFF search failed: {type(error).__name__}: {error}"}]}
        raise ValueError("Unsupported MCP method")


def main():
    def stop(signum, frame):
        raise SystemExit(128 + signum)

    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)
    router = Router()
    try:
        for line in sys.stdin:
            message = {}
            try:
                message = json.loads(line)
                if not isinstance(message, dict):
                    message = {}
                    raise ValueError("Expected a JSON-RPC object")
                if "id" not in message:
                    continue
                response = {"jsonrpc": "2.0", "id": message["id"],
                            "result": router.dispatch(message)}
            except Exception as error:
                response = {"jsonrpc": "2.0", "id": message.get("id"),
                            "error": {"code": -32600, "message": str(error)}}
            print(json.dumps(response, separators=(",", ":")), flush=True)
    finally:
        router.close()


if __name__ == "__main__":
    main()
