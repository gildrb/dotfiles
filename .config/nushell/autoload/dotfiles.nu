# Nushell settings that apply at once: edit, then open a new shell.
# Home Manager writes config.nu (environment, mise, zoxide, prompt); Nushell
# loads this file after it. Colors: theme/amber.json.

$env.config.show_banner = false

$env.config.color_config = {
    foreground: "#ffc757"
    background: "#000000"
    cursor: "#ffa914"
    shape_string: "#fbda44"
    shape_string_interpolation: "#fbda44"
    shape_raw_string: "#fbda44"
    shape_record: "#ffa914"
    shape_list: "#ffa914"
    shape_table: "#ffa914"
    shape_block: "#ffa914"
    shape_closure: "#ffa914"
    shape_bool: "#f6e9c8"
    shape_nothing: "#f6e9c8"
    shape_literal: "#f6e9c8"
    shape_datetime: "#f6e9c8"
    shape_match_pattern: "#f6e9c8"
    shape_int: "#f6e9c8"
    shape_float: "#f6e9c8"
    shape_binary: "#f6e9c8"
    shape_range: "#ffa914"
    shape_operator: "#ffa914"
    shape_pipe: "#ffa914"
    shape_redirection: "#ffa914"
    shape_custom: "#ffc757"
    shape_filepath: "#ffc757"
    shape_directory: "#ffc757"
    shape_globpattern: "#ffc757"
    shape_glob_interpolation: "#ffc757"
    shape_variable: "#ffc757"
    shape_vardecl: "#ffc757"
    shape_internalcall: "#ffdc96"
    shape_external: "#ffdc96"
    shape_external_resolved: "#ffdc96"
    shape_externalarg: "#ffc757"
    shape_flag: "#ffbf72"
    shape_signature: "#ffbf72"
    shape_keyword: "#ffc091"
    shape_matching_brackets: { attr: "u" }
    shape_garbage: { fg: "#000000", bg: "#ff9381", attr: "b" }
    bool: "#f6e9c8"
    int: "#f6e9c8"
    float: "#f6e9c8"
    filesize: "#f6e9c8"
    duration: "#f6e9c8"
    binary: "#f6e9c8"
    datetime: "#f6e9c8"
    range: "#ffa914"
    string: "#ffc757"
    glob: "#ffc757"
    cell-path: "#ffc757"
    closure: "#ffdc96"
    custom: "#ffc757"
    nothing: "#faa003"
    empty: "#faa003"
    hints: "#ff7b25"
    separator: "#633f0c"
    row_index: "#ff7b25"
    header: { fg: "#ffbf72", attr: "b" }
    search_result: { fg: "#ffc757", bg: "#000066" }
    binary_null_char: "#ff7b25"
    binary_printable: "#fbda44"
    binary_whitespace: "#ffa914"
    binary_ascii_other: "#ffbf72"
    binary_non_ascii: "#fade01"
}

# File names in `ls` and other tools. The NixOS default (dircolors) uses ANSI
# colors, which take the host terminal's palette; these are Amber truecolor.
let amber_ls = {
    text: "38;2;255;199;87"
    bright: "38;2;255;224;167"
    func: "38;2;255;220;150"
    punct: "38;2;255;169;20"
    muted: "38;2;250;160;3"
    gutter: "38;2;255;123;37"
    string: "38;2;251;218;68"
    error: "38;2;255;147;129"
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
