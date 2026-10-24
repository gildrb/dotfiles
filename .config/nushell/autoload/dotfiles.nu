# Nushell settings that apply at once: edit, then open a new shell.
# Home Manager writes config.nu (environment, mise, zoxide); Nushell loads this
# file after it. Colors: theme/death-note.json.

$env.config.show_banner = false

# Host tag: every host runs identical themes and prompts, so a colored host tag
# is the at-a-glance cue for which machine a shell is on: info blue on macOS,
# accent red elsewhere. Truecolor, so the terminal's ANSI palette cannot change it.
let host_tag = (sys host | get hostname)
let host_color = if $nu.os-info.name == "macos" { "#7dbaf8" } else { "#ff95b4" }
$env.PROMPT_COMMAND = {||
    $"(ansi --escape {fg: $host_color})($host_tag)(ansi reset) (pwd | str replace $env.HOME '~')"
}
$env.PROMPT_COMMAND_RIGHT = {||
    $"(ansi --escape {fg: '#a2a3a7'})(date now | format date '%H:%M')(ansi reset)"
}

$env.config.color_config = {
    foreground: "#dddee1"
    background: "#0e0e11"
    cursor: "#ff95b4"
    shape_string: "#76c788"
    shape_string_interpolation: "#76c788"
    shape_raw_string: "#76c788"
    shape_record: "#c2c3c7"
    shape_list: "#c2c3c7"
    shape_table: "#c2c3c7"
    shape_block: "#c2c3c7"
    shape_closure: "#c2c3c7"
    shape_bool: "#e6a960"
    shape_nothing: "#e6a960"
    shape_literal: "#e6a960"
    shape_datetime: "#e6a960"
    shape_match_pattern: "#e6a960"
    shape_int: "#e6a960"
    shape_float: "#e6a960"
    shape_binary: "#e6a960"
    shape_range: "#ff95b4"
    shape_operator: "#ff95b4"
    shape_pipe: "#ff95b4"
    shape_redirection: "#ff95b4"
    shape_custom: "#dddee1"
    shape_filepath: "#7dbaf8"
    shape_directory: "#7dbaf8"
    shape_globpattern: "#7dbaf8"
    shape_glob_interpolation: "#7dbaf8"
    shape_variable: "#7dbaf8"
    shape_vardecl: "#dddee1"
    shape_internalcall: "#caa5f6"
    shape_external: "#caa5f6"
    shape_external_resolved: "#caa5f6"
    shape_externalarg: "#dddee1"
    shape_flag: "#e6a960"
    shape_signature: "#6cc4be"
    shape_keyword: "#ff95b4"
    shape_matching_brackets: { attr: "u" }
    shape_garbage: { fg: "#0e0e11", bg: "#fe9a86", attr: "b" }
    bool: "#e6a960"
    int: "#e6a960"
    float: "#e6a960"
    filesize: "#e6a960"
    duration: "#e6a960"
    binary: "#e6a960"
    datetime: "#e6a960"
    range: "#c2c3c7"
    string: "#76c788"
    glob: "#dddee1"
    cell-path: "#dddee1"
    closure: "#caa5f6"
    custom: "#dddee1"
    nothing: "#a2a3a7"
    empty: "#a2a3a7"
    hints: "#8b8c91"
    separator: "#323237"
    row_index: "#8b8c91"
    header: { fg: "#6cc4be", attr: "b" }
    search_result: { fg: "#dddee1", bg: "#512631" }
    binary_null_char: "#8b8c91"
    binary_printable: "#e6a960"
    binary_whitespace: "#c2c3c7"
    binary_ascii_other: "#6cc4be"
    binary_non_ascii: "#e6a960"
}

# File names in `ls` and other tools. The NixOS default (dircolors) uses ANSI
# colors, which take the host terminal's palette; these are Death Note truecolor.
let theme_ls = {
    text: "38;2;221;222;225"
    exec: "38;2;118;199;136"
    dir: "38;2;125;186;248"
    link: "38;2;108;196;190"
    muted: "38;2;162;163;167"
    gutter: "38;2;139;140;145"
    media: "38;2;202;165;246"
    error: "38;2;254;154;134"
}
let archives = [tar tgz zip 7z gz bz2 xz zst rar deb rpm jar iso dmg]
let media = [png jpg jpeg gif webp svg avif heic mp4 mkv mov webm mp3 flac wav ogg m4a pdf]
$env.LS_COLORS = ([
    "rs=0"
    $"no=($theme_ls.text)"
    $"fi=($theme_ls.text)"
    $"di=1;($theme_ls.dir)"
    $"ln=($theme_ls.link)"
    $"or=($theme_ls.error)"
    $"mi=($theme_ls.error)"
    $"ex=1;($theme_ls.exec)"
    $"pi=($theme_ls.muted)"
    $"so=($theme_ls.muted)"
    $"do=($theme_ls.muted)"
    $"bd=($theme_ls.muted)"
    $"cd=($theme_ls.muted)"
    $"su=1;($theme_ls.error)"
    $"sg=1;($theme_ls.error)"
    $"tw=1;($theme_ls.dir)"
    $"ow=1;($theme_ls.dir)"
    $"st=1;($theme_ls.dir)"
]
| append ($archives | each {|extension| $"*.($extension)=($theme_ls.gutter)" })
| append ($media | each {|extension| $"*.($extension)=($theme_ls.media)" })
| str join ":")
