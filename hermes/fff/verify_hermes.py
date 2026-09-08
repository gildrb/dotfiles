"""Run with Hermes's Python: verify staged config without editing live state."""
import json
from pathlib import Path
from unittest.mock import patch

from tools import mcp_tool
from tools.registry import registry


def main():
    config = json.loads((Path(__file__).resolve().parents[1] / "config.json").read_text())
    with patch.object(mcp_tool, "_load_mcp_config", return_value=config["mcp_servers"]):
        try:
            names = mcp_tool.discover_mcp_tools()
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
            mcp_tool.shutdown_mcp_servers()


if __name__ == "__main__":
    main()
