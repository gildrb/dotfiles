"""Run with Hermes's Python and the hermes-fff executable to verify discovery."""
import json
import sys
from pathlib import Path
from unittest.mock import patch

from tools import mcp_tool_config
from tools.mcp_tool_discovery import discover_mcp_tools
from tools.mcp_tool_lifecycle import shutdown_mcp_servers
from tools.registry import registry


def main():
    config = json.loads((Path(__file__).resolve().parents[1] / "config.json").read_text())
    servers = config["mcp_servers"]
    servers["fff"] = {**servers["fff"], "command": sys.argv[1], "args": []}
    with patch.object(mcp_tool_config, "_load_mcp_config", return_value=servers):
        try:
            names = discover_mcp_tools()
            expected = {"mcp__fff__find_files", "mcp__fff__grep", "mcp__fff__multi_grep"}
            assert set(names) == expected, names
            print("Hermes discovered:", ", ".join(sorted(names)))
            response = registry.dispatch("mcp__fff__grep", {
                "root": str(Path(__file__).resolve().parents[2]),
                "query": "hermes/config.json mcp_servers",
                "maxResults": 5,
            })
            print("Actual Hermes tool result:", response)
            assert "mcp_servers" in str(response) and "config.json" in str(response), response
            print("PASS: native Hermes discovery and real FFF search")
        finally:
            shutdown_mcp_servers()


if __name__ == "__main__":
    main()
