{
  description = "Pinned local FFF MCP integration for Hermes (x86_64 Linux)";
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/d482ef84049d9b7276b83a06e4e4d76983830097";
  outputs = { self, nixpkgs }:
    let
      system = "x86_64-linux";
      pkgs = import nixpkgs { inherit system; };
      fff = pkgs.stdenvNoCC.mkDerivation {
        pname = "fff-mcp";
        version = "0.10.6";
        src = pkgs.fetchurl {
          url = "https://github.com/dmtrKovalenko/fff/releases/download/v0.10.6/fff-mcp-x86_64-unknown-linux-musl";
          sha256 = "a44ef64015f1754aa63b690c24d9a748ed16298f05350da7b09554c4c98dfb0f";
        };
        dontUnpack = true;
        dontStrip = true;
        installPhase = ''
          install -Dm755 "$src" "$out/bin/fff-mcp"
        '';
        meta = { platforms = [ system ]; mainProgram = "fff-mcp"; };
      };
      router = pkgs.writeShellApplication {
        name = "hermes-fff";
        text = ''
          export FFF_MCP_BINARY=${fff}/bin/fff-mcp
          exec ${pkgs.python3}/bin/python3 ${./server.py} "$@"
        '';
      };
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
