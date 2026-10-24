# Nushell settings that apply at once: edit, then open a new shell.
# Home Manager writes config.nu (environment, mise, zoxide, prompt); Nushell
# loads this file after it. Colors: theme/amber.json.

$env.config.show_banner = false

$env.config.color_config = {
    foreground: "#e8e4dc"
    background: "#12110f"
    cursor: "#eba862"
    shape_string: "#ecc273"
    shape_string_interpolation: "#ecc273"
    shape_raw_string: "#ecc273"
    shape_record: "#bbb6ac"
    shape_list: "#bbb6ac"
    shape_table: "#bbb6ac"
    shape_block: "#bbb6ac"
    shape_closure: "#bbb6ac"
    shape_bool: "#f7a07a"
    shape_nothing: "#f7a07a"
    shape_literal: "#f7a07a"
    shape_datetime: "#f7a07a"
    shape_match_pattern: "#f7a07a"
    shape_int: "#f7a07a"
    shape_float: "#f7a07a"
    shape_binary: "#f7a07a"
    shape_range: "#bbb6ac"
    shape_operator: "#bbb6ac"
    shape_pipe: "#bbb6ac"
    shape_redirection: "#bbb6ac"
    shape_custom: "#e8e4dc"
    shape_filepath: "#e8e4dc"
    shape_directory: "#e8e4dc"
    shape_globpattern: "#e8e4dc"
    shape_glob_interpolation: "#e8e4dc"
    shape_variable: "#e8e4dc"
    shape_vardecl: "#e8e4dc"
    shape_internalcall: "#f4f1ea"
    shape_external: "#f4f1ea"
    shape_external_resolved: "#f4f1ea"
    shape_externalarg: "#e8e4dc"
    shape_flag: "#d1b6fe"
    shape_signature: "#d1b6fe"
    shape_keyword: "#d9b08c"
    shape_matching_brackets: { attr: "u" }
    shape_garbage: { fg: "#12110f", bg: "#f39a8a", attr: "b" }
    bool: "#f7a07a"
    int: "#f7a07a"
    float: "#f7a07a"
    filesize: "#f7a07a"
    duration: "#f7a07a"
    binary: "#f7a07a"
    datetime: "#f7a07a"
    range: "#bbb6ac"
    string: "#e8e4dc"
    glob: "#e8e4dc"
    cell-path: "#e8e4dc"
    closure: "#f4f1ea"
    custom: "#e8e4dc"
    nothing: "#b0aba1"
    empty: "#b0aba1"
    hints: "#a19c92"
    separator: "#3d3a35"
    row_index: "#a19c92"
    header: { fg: "#d1b6fe", attr: "b" }
    search_result: { fg: "#e8e4dc", bg: "#3a3024" }
    binary_null_char: "#a19c92"
    binary_printable: "#ecc273"
    binary_whitespace: "#bbb6ac"
    binary_ascii_other: "#d1b6fe"
    binary_non_ascii: "#ecc273"
}

# File names in `ls` and other tools. The NixOS default (dircolors) uses ANSI
# colors, which take the host terminal's palette; these are Amber truecolor.
let amber_ls = {
    text: "38;2;232;228;220"
    bright: "38;2;244;241;234"
    func: "38;2;244;241;234"
    punct: "38;2;187;182;172"
    muted: "38;2;176;171;161"
    gutter: "38;2;161;156;146"
    string: "38;2;236;194;115"
    error: "38;2;243;154;138"
}
let archives = [tar tgz zip 7z gz bz2 xz zst rar deb rpm jar iso dmg]
let media = [png jpg jpeg gif webp svg avif heic mp4 mkv mov webm mp3 flac wav ogg m4a pdf]
$env.LS_COLORS = ([
    "rs=0"
    $"no=($amber_ls.text)"
    $"fi=($amber_ls.text)"
    $"di=1;($amber_ls.func)"
    $"ln=($amber_ls.punct)"
    $"or=($amber_ls.error)"
    $"mi=($amber_ls.error)"
    $"ex=1;($amber_ls.bright)"
    $"pi=($amber_ls.muted)"
    $"so=($amber_ls.muted)"
    $"do=($amber_ls.muted)"
    $"bd=($amber_ls.muted)"
    $"cd=($amber_ls.muted)"
    $"su=1;($amber_ls.gutter)"
    $"sg=1;($amber_ls.gutter)"
    $"tw=1;($amber_ls.func)"
    $"ow=1;($amber_ls.func)"
    $"st=1;($amber_ls.func)"
]
| append ($archives | each {|extension| $"*.($extension)=($amber_ls.gutter)" })
| append ($media | each {|extension| $"*.($extension)=($amber_ls.string)" })
| str join ":")
