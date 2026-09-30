{
  description = "Pinned local FFF MCP integration for Hermes (x86_64 Linux)";
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/d482ef84049d9b7276b83a06e4e4d76983830097";
  outputs = { self, nixpkgs }:
    let
      system = "x86_64-linux";
      pkgs = import nixpkgs { inherit system; };
      router = pkgs.callPackage ./package.nix {};
      fff = router.fff;
    in {
      packages.${system} = { default = router; inherit fff; };
      apps.${system}.default = {
        type = "app";
        program = "${router}/bin/hermes-fff";
        meta.description = "Local multi-root FFF MCP server for Hermes";
      };
      checks.${system}.integration = pkgs.runCommand "hermes-fff-integration" {
        nativeBuildInputs = [ pkgs.python3 ];
        FFF_MCP_BINARY = "${fff}/bin/fff-mcp";
      } ''
        export HOME="$TMPDIR/home"
        mkdir -p "$HOME"
        cp ${./server.py} server.py
        cp ${./test_server.py} test_server.py
        python3 -m unittest -v test_server
        touch "$out"
      '';
    };
}
