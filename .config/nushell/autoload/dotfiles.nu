# Nushell settings that apply at once: edit, then open a new shell.
# Home Manager writes config.nu (environment, mise, zoxide); Nushell loads this
# file after it. Colors: theme/forge.json.

$env.config.show_banner = false

# Host tag: every host runs identical themes and prompts, so a colored host tag
# is the at-a-glance cue for which machine a shell is on: info blue on macOS,
# accent gilt elsewhere. Truecolor, so the terminal's ANSI palette cannot change it.
let host_tag = (sys host | get hostname)
let host_color = if $nu.os-info.name == "macos" { "#8cb7e5" } else { "#d4af5d" }
$env.PROMPT_COMMAND = {||
    $"(ansi --escape {fg: $host_color})($host_tag)(ansi reset) (pwd | str replace $env.HOME '~')"
}
$env.PROMPT_COMMAND_RIGHT = {||
    $"(ansi --escape {fg: '#a9a098'})(date now | format date '%H:%M')(ansi reset)"
}

$env.config.color_config = {
    foreground: "#e0d6c6"
    background: "#110b07"
    cursor: "#d4af5d"
    shape_string: "#8ec184"
    shape_string_interpolation: "#8ec184"
    shape_raw_string: "#8ec184"
    shape_record: "#c6c1bb"
    shape_list: "#c6c1bb"
    shape_table: "#c6c1bb"
    shape_block: "#c6c1bb"
    shape_closure: "#c6c1bb"
    shape_bool: "#eba474"
    shape_nothing: "#eba474"
    shape_literal: "#eba474"
    shape_datetime: "#eba474"
    shape_match_pattern: "#eba474"
    shape_int: "#eba474"
    shape_float: "#eba474"
    shape_binary: "#eba474"
    shape_range: "#d4af5d"
    shape_operator: "#d4af5d"
    shape_pipe: "#d4af5d"
    shape_redirection: "#d4af5d"
    shape_custom: "#e0d6c6"
    shape_filepath: "#8cb7e5"
    shape_directory: "#8cb7e5"
    shape_globpattern: "#8cb7e5"
    shape_glob_interpolation: "#8cb7e5"
    shape_variable: "#8cb7e5"
    shape_vardecl: "#e0d6c6"
    shape_internalcall: "#cda6df"
    shape_external: "#cda6df"
    shape_external_resolved: "#cda6df"
    shape_externalarg: "#e0d6c6"
    shape_flag: "#eba474"
    shape_signature: "#79c1b2"
    shape_keyword: "#d4af5d"
    shape_matching_brackets: { attr: "u" }
    shape_garbage: { fg: "#110b07", bg: "#f69c8e", attr: "b" }
    bool: "#eba474"
    int: "#eba474"
    float: "#eba474"
    filesize: "#eba474"
    duration: "#eba474"
    binary: "#eba474"
    datetime: "#eba474"
    range: "#c6c1bb"
    string: "#8ec184"
    glob: "#e0d6c6"
    cell-path: "#e0d6c6"
    closure: "#cda6df"
    custom: "#e0d6c6"
    nothing: "#a9a098"
    empty: "#a9a098"
    hints: "#9e8773"
    separator: "#312d2a"
    row_index: "#9e8773"
    header: { fg: "#79c1b2", attr: "b" }
    search_result: { fg: "#e0d6c6", bg: "#2b241f" }
    binary_null_char: "#9e8773"
    binary_printable: "#eba474"
    binary_whitespace: "#c6c1bb"
    binary_ascii_other: "#79c1b2"
    binary_non_ascii: "#eba474"
}

# File names in `ls` and other tools. The NixOS default (dircolors) uses ANSI
# colors, which take the host terminal's palette; these are Forge truecolor.
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
