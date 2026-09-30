{ stdenvNoCC, fetchurl, writeShellApplication, python3 }:
let
  fff = stdenvNoCC.mkDerivation {
    pname = "fff-mcp";
    version = "0.10.6";
    src = fetchurl {
      url = "https://github.com/dmtrKovalenko/fff/releases/download/v0.10.6/fff-mcp-x86_64-unknown-linux-musl";
      sha256 = "a44ef64015f1754aa63b690c24d9a748ed16298f05350da7b09554c4c98dfb0f";
    };
    dontUnpack = true;
    dontStrip = true;
    installPhase = ''
      install -Dm755 "$src" "$out/bin/fff-mcp"
    '';
    meta = { platforms = [ "x86_64-linux" ]; mainProgram = "fff-mcp"; };
  };
in
(writeShellApplication {
  name = "hermes-fff";
  text = ''
    export FFF_MCP_BINARY=${fff}/bin/fff-mcp
    exec ${python3}/bin/python3 ${./server.py} "$@"
  '';
}).overrideAttrs (_: { passthru = { inherit fff; }; })
