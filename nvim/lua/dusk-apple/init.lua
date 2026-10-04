local M = {}
local p = require("dusk-apple.palette")

local function set(group, options)
  vim.api.nvim_set_hl(0, group, options)
end

local function link(group, target)
  set(group, { link = target })
end

local function transparent(foreground)
  return { fg = foreground, bg = "NONE" }
end

function M.load()
  if vim.g.colors_name then
    vim.cmd("highlight clear")
  end

  vim.opt.background = "dark"
  vim.opt.termguicolors = true
  vim.g.colors_name = "dusk-apple"

  local background = vim.g.dusk_apple_transparent == false and p.ink or "NONE"

  set("Normal", { fg = p.paper, bg = background })
  set("NormalNC", { fg = p.punct, bg = background })
  set("NormalFloat", { fg = p.paper, bg = background })
  set("NormalSB", { fg = p.punct, bg = background })
  set("MsgArea", { fg = p.paper, bg = background })
  set("MsgSeparator", { fg = p.accent, bg = background })
  set("FloatBorder", { fg = p.accent, bg = background })
  set("FloatTitle", { fg = p.accent, bg = background, bold = true })
  set("WinSeparator", { fg = p.accent, bg = background })
  set("EndOfBuffer", { fg = p.ink, bg = background })
  set("NonText", transparent(p.guide))
  set("Whitespace", transparent(p.guide))
  set("SpecialKey", transparent(p.comment))
  set("SignColumn", { fg = p.gutter, bg = background })
  set("FoldColumn", { fg = p.gutter, bg = background })
  set("Folded", { fg = p.comment, bg = background, italic = true })
  set("LineNr", { fg = p.gutter, bg = background })
  set("LineNrAbove", { fg = p.gutter, bg = background })
  set("LineNrBelow", { fg = p.gutter, bg = background })
  set("CursorLine", { bg = p.cursorline })
  set("CursorColumn", { bg = p.cursorline })
  set("CursorLineNr", { fg = p.accent, bg = background, bold = true })
  set("CursorLineSign", { fg = p.accent, bg = background })
  set("CursorLineFold", { fg = p.accent, bg = background })
  set("ColorColumn", { bg = background })
  set("Visual", { fg = p.paper, bg = p.selection })
  set("VisualNOS", { fg = p.paper, bg = p.selection })
  set("Search", { fg = p.ink, bg = p.warn })
  set("IncSearch", { fg = p.ink, bg = p.accent })
  link("CurSearch", "IncSearch")
  set("Substitute", { fg = p.ink, bg = p.accent, bold = true })
  set("MatchParen", { fg = p.accent, bold = true, underline = true })
  set("Directory", { fg = p.info, bold = true })
  set("Title", { fg = p.accent, bold = true })
  set("Question", { fg = p.ok })
  set("MoreMsg", { fg = p.ok })
  set("ModeMsg", { fg = p.punct, bold = true })
  set("WarningMsg", { fg = p.warn })
  set("ErrorMsg", { fg = p.error, bold = true })
  set("Conceal", { fg = p.comment })
  set("QuickFixLine", { fg = p.accent, bold = true })

  set("Pmenu", { fg = p.paper, bg = background })
  set("PmenuSel", { fg = p.accent, bg = background, bold = true, underline = true })
  set("PmenuKind", { fg = p.type, bg = background })
  set("PmenuKindSel", { fg = p.accent, bg = background, bold = true })
  set("PmenuExtra", { fg = p.comment, bg = background })
  set("PmenuExtraSel", { fg = p.punct, bg = background })
  set("PmenuSbar", { bg = background })
  set("PmenuThumb", { bg = p.accent })
  set("StatusLine", { fg = p.punct, bg = background })
  set("StatusLineNC", { fg = p.comment, bg = background })
  set("WinBar", { fg = p.paper, bg = background, bold = true })
  set("WinBarNC", { fg = p.comment, bg = background })
  set("TabLine", { fg = p.comment, bg = background })
  set("TabLineFill", { fg = p.gutter, bg = background })
  set("TabLineSel", { fg = p.accent, bg = background, bold = true })
  set("WildMenu", { fg = p.accent, bg = background, bold = true })

  set("Comment", { fg = p.comment, italic = true })
  set("Constant", { fg = p.constant })
  set("String", { fg = p.string })
  link("Character", "String")
  set("Number", { fg = p.number })
  set("Boolean", { fg = p.constant })
  link("Float", "Number")
  set("Identifier", { fg = p.paper })
  set("Parameter", { fg = p.parameter })
  set("Function", { fg = p.func })
  set("Statement", { fg = p.keyword })
  link("Conditional", "Statement")
  link("Repeat", "Statement")
  set("Label", { fg = p.keyword })
  set("Operator", { fg = p.operator })
  set("Keyword", { fg = p.keyword })
  link("Exception", "Statement")
  set("PreProc", { fg = p.keyword })
  link("Include", "Keyword")
  link("Define", "Keyword")
  link("Macro", "Constant")
  link("PreCondit", "Keyword")
  set("Type", { fg = p.type })
  link("StorageClass", "Keyword")
  link("Structure", "Type")
  link("Typedef", "Type")
  set("Special", { fg = p.type })
  set("SpecialChar", { fg = p.string })
  set("Tag", { fg = p.string })
  set("Delimiter", { fg = p.punct })
  set("SpecialComment", { fg = p.comment, italic = true })
  set("Debug", { fg = p.keyword })
  set("Underlined", { fg = p.info, underline = true })
  set("Todo", { fg = p.warn, bold = true })
  set("Error", { fg = p.error, bold = true })

  set("DiagnosticError", { fg = p.error })
  set("DiagnosticWarn", { fg = p.warn })
  set("DiagnosticInfo", { fg = p.info })
  set("DiagnosticHint", { fg = p.func })
  set("DiagnosticOk", { fg = p.ok })
  link("DiagnosticVirtualTextError", "DiagnosticError")
  link("DiagnosticVirtualTextWarn", "DiagnosticWarn")
  link("DiagnosticVirtualTextInfo", "DiagnosticInfo")
  link("DiagnosticVirtualTextHint", "DiagnosticHint")
  set("DiagnosticUnderlineError", { undercurl = true, sp = p.error })
  set("DiagnosticUnderlineWarn", { undercurl = true, sp = p.warn })
  set("DiagnosticUnderlineInfo", { undercurl = true, sp = p.info })
  set("DiagnosticUnderlineHint", { undercurl = true, sp = p.func })
  set("DiagnosticUnderlineOk", { undercurl = true, sp = p.ok })
  set("DiagnosticDeprecated", { strikethrough = true, sp = p.gutter })
  set("DiagnosticUnnecessary", { fg = p.gutter })
  set("LspInlayHint", { fg = p.gutter, italic = true })

  M.treesitter()
  M.semantic_tokens()

  set("DiffAdd", { bg = p.addedSurface })
  set("DiffChange", { fg = p.warn })
  set("DiffDelete", { fg = p.error, bg = p.removedSurface })
  set("DiffText", { fg = p.paper, bold = true, underline = true, sp = p.warn })
  set("diffAdded", { fg = p.ok })
  set("diffRemoved", { fg = p.error })
  set("diffChanged", { fg = p.warn })
  set("diffLine", { fg = p.comment })
  set("diffSubname", { fg = p.gutter })
  set("diffFile", { fg = p.accent, bold = true })
  set("diffIndexLine", { fg = p.func })
  set("diffOldFile", { fg = p.error })
  set("diffNewFile", { fg = p.ok })
  link("Added", "diffAdded")
  link("Changed", "diffChanged")
  link("Removed", "diffRemoved")

  set("SpellBad", { undercurl = true, sp = p.error })
  set("SpellCap", { undercurl = true, sp = p.warn })
  set("SpellLocal", { undercurl = true, sp = p.info })
  set("SpellRare", { undercurl = true, sp = p.func })
  set("healthError", { fg = p.error })
  set("healthWarning", { fg = p.warn })
  set("healthSuccess", { fg = p.ok })
  set("OkMsg", { fg = p.ok })
  set("FloatShadow", { bg = background })
  set("FloatShadowThrough", { bg = background })
  set("NvimInternalError", { fg = p.error, bg = background })
  set("RedrawDebugClear", { fg = p.warn, bg = background })
  set("RedrawDebugComposed", { fg = p.ok, bg = background })
  set("RedrawDebugRecompose", { fg = p.accent, bg = background })

  M.plugins(background)
  M.terminal()

  local group = vim.api.nvim_create_augroup("dusk_apple_theme", { clear = true })
  vim.api.nvim_create_autocmd("User", {
    group = group,
    pattern = "LazyLoad",
    desc = "Keep lazy-loaded plugins inside the Dusk Apple palette",
    callback = function()
      vim.schedule(function()
        M.plugins(background)
      end)
    end,
  })
end

function M.treesitter()
  local links = {
    ["@annotation"] = "PreProc",
    ["@attribute"] = "PreProc",
    ["@boolean"] = "Boolean",
    ["@character"] = "Character",
    ["@comment"] = "Comment",
    ["@comment.documentation"] = "SpecialComment",
    ["@comment.error"] = "Error",
    ["@comment.todo"] = "Todo",
    ["@comment.warning"] = "WarningMsg",
    ["@comment.note"] = "DiagnosticHint",
    ["@constant"] = "Constant",
    ["@constant.builtin"] = "Constant",
    ["@constant.macro"] = "Constant",
    ["@constructor"] = "Type",
    ["@function"] = "Function",
    ["@function.builtin"] = "Function",
    ["@function.call"] = "Function",
    ["@function.macro"] = "Function",
    ["@function.method"] = "Function",
    ["@function.method.call"] = "Function",
    ["@method"] = "Function",
    ["@method.call"] = "Function",
    ["@keyword"] = "Keyword",
    ["@keyword.conditional"] = "Keyword",
    ["@keyword.conditional.ternary"] = "Operator",
    ["@keyword.coroutine"] = "Keyword",
    ["@keyword.debug"] = "Debug",
    ["@keyword.directive"] = "Keyword",
    ["@keyword.directive.define"] = "Keyword",
    ["@keyword.exception"] = "Keyword",
    ["@keyword.function"] = "Keyword",
    ["@keyword.import"] = "Keyword",
    ["@keyword.operator"] = "Operator",
    ["@keyword.repeat"] = "Keyword",
    ["@keyword.return"] = "Keyword",
    ["@keyword.storage"] = "Keyword",
    ["@label"] = "Label",
    ["@markup.heading"] = "Title",
    ["@markup.link"] = "Underlined",
    ["@markup.link.label"] = "Underlined",
    ["@markup.link.url"] = "Underlined",
    ["@markup.list"] = "Tag",
    ["@markup.quote"] = "SpecialComment",
    ["@markup.raw"] = "Special",
    ["@markup.raw.block"] = "Normal",
    ["@markup.strikethrough"] = "DiagnosticDeprecated",
    ["@module"] = "Type",
    ["@module.builtin"] = "Type",
    ["@number"] = "Number",
    ["@number.float"] = "Float",
    ["@operator"] = "Operator",
    ["@property"] = "Identifier",
    ["@punctuation"] = "Delimiter",
    ["@punctuation.bracket"] = "Delimiter",
    ["@punctuation.delimiter"] = "Delimiter",
    ["@punctuation.special"] = "Delimiter",
    ["@string"] = "String",
    ["@string.documentation"] = "SpecialComment",
    ["@string.escape"] = "SpecialChar",
    ["@string.regexp"] = "String",
    ["@string.special"] = "String",
    ["@string.special.path"] = "Directory",
    ["@string.special.symbol"] = "Constant",
    ["@string.special.url"] = "Underlined",
    ["@tag"] = "String",
    ["@tag.attribute"] = "Identifier",
    ["@tag.builtin"] = "String",
    ["@tag.delimiter"] = "Delimiter",
    ["@type"] = "Type",
    ["@type.builtin"] = "Type",
    ["@type.definition"] = "Type",
    ["@variable"] = "Identifier",
    ["@variable.builtin"] = "Special",
    ["@variable.member"] = "Identifier",
    ["@variable.parameter"] = "Parameter",
    ["@variable.parameter.builtin"] = "Parameter",
  }

  for group, target in pairs(links) do
    link(group, target)
  end

  set("@variable", { fg = p.paper })
  set("@variable.builtin", { fg = p.builtin })
  set("@variable.parameter", { fg = p.parameter })
  set("@variable.parameter.builtin", { fg = p.builtin })
  set("@variable.member", { fg = p.property })
  set("@property", { fg = p.property })
  set("@function.builtin", { fg = p.builtin })
  set("@type.builtin", { fg = p.builtin })
  set("@constant.builtin", { fg = p.builtin })
  set("@module.builtin", { fg = p.builtin })
  set("@tag.builtin", { fg = p.builtin })
  set("@keyword.return", { fg = p.keyword })
  set("@markup.heading", { fg = p.accent, bold = true })
  set("@markup.link.url", { fg = p.comment, underline = true })
  set("@markup.quote", { fg = p.punct, italic = true })
  set("@markup.strong", { fg = p.paper, bold = true })
  set("@markup.italic", { fg = p.punct, italic = true })
  set("@diff.plus", { fg = p.ok })
  set("@diff.minus", { fg = p.error })
  set("@diff.delta", { fg = p.warn })
end

function M.semantic_tokens()
  local links = {
    ["@lsp.type.class"] = "Type",
    ["@lsp.type.comment"] = "Comment",
    ["@lsp.type.decorator"] = "PreProc",
    ["@lsp.type.enum"] = "Type",
    ["@lsp.type.enumMember"] = "Constant",
    ["@lsp.type.event"] = "Special",
    ["@lsp.type.function"] = "Function",
    ["@lsp.type.interface"] = "Type",
    ["@lsp.type.keyword"] = "Keyword",
    ["@lsp.type.macro"] = "Macro",
    ["@lsp.type.method"] = "Function",
    ["@lsp.type.modifier"] = "Keyword",
    ["@lsp.type.namespace"] = "Type",
    ["@lsp.type.number"] = "Number",
    ["@lsp.type.operator"] = "Operator",
    ["@lsp.type.parameter"] = "Parameter",
    ["@lsp.type.property"] = "@property",
    ["@lsp.type.regexp"] = "String",
    ["@lsp.type.string"] = "String",
    ["@lsp.type.struct"] = "Type",
    ["@lsp.type.type"] = "Type",
    ["@lsp.type.typeParameter"] = "Type",
    ["@lsp.type.variable"] = "@variable",
  }

  for group, target in pairs(links) do
    link(group, target)
  end

  link("@lsp.typemod.variable.readonly", "@variable")
  link("@lsp.typemod.variable.defaultLibrary", "@variable.builtin")
  link("@lsp.typemod.function.defaultLibrary", "Function")
  set("@lsp.mod.deprecated", { strikethrough = true, sp = p.gutter })
end

function M.plugins(background)
  local function surface(group, foreground)
    set(group, { fg = foreground or p.paper, bg = background })
  end

  surface("NvimTreeNormal", p.punct)
  surface("NvimTreeNormalNC", p.comment)
  surface("NvimTreeEndOfBuffer", p.ink)
  set("NvimTreeRootFolder", { fg = p.accent, bold = true })
  set("NvimTreeFolderName", { fg = p.info })
  set("NvimTreeFolderIcon", { fg = p.info })
  set("NvimTreeOpenedFolderName", { fg = p.info, bold = true })
  set("NvimTreeIndentMarker", { fg = p.guide })
  surface("NvimTreeWinSeparator", p.accent)
  set("NvimTreeGitDirty", { fg = p.warn })
  set("NvimTreeGitNew", { fg = p.ok })
  set("NvimTreeGitDeleted", { fg = p.error })
  set("NvimTreeSpecialFile", { fg = p.type })
  set("NvimTreeSymlink", { fg = p.func })
  set("NvimTreeWindowPicker", { fg = p.accent, bg = background, bold = true })

  surface("FzfLuaNormal")
  surface("FzfLuaBorder", p.accent)
  surface("FzfLuaTitle", p.accent)
  set("FzfLuaTitle", { fg = p.accent, bg = background, bold = true })
  set("FzfLuaCursor", { fg = p.accent, bg = background, bold = true })
  set("FzfLuaSearch", { fg = p.warn, bold = true })
  set("FzfLuaPath", { fg = p.comment })
  set("FzfLuaPathColNr", { fg = p.type })
  set("FzfLuaPathLineNr", { fg = p.ok })
  set("FzfLuaBufNr", { fg = p.punct })
  set("FzfLuaBufFlagCur", { fg = p.accent })
  set("FzfLuaBufFlagAlt", { fg = p.comment })
  set("FzfLuaTabTitle", { fg = p.info })
  set("FzfLuaTabMarker", { fg = p.accent })
  set("FzfLuaLivePrompt", { fg = p.accent })
  set("FzfLuaLiveSym", { fg = p.accent })
  set("FzfLuaBackdrop", { bg = background })
  set("FzfLuaHeaderBind", { fg = p.accent })
  set("FzfLuaHeaderText", { fg = p.punct })

  set("WhichKey", { fg = p.accent })
  set("WhichKeyGroup", { fg = p.info })
  set("WhichKeyDesc", { fg = p.paper })
  set("WhichKeySeparator", { fg = p.gutter })
  set("WhichKeyIcon", { fg = p.accent })
  set("WhichKeyNormal", { fg = p.paper, bg = background })

  set("GitSignsAdd", { fg = p.ok })
  set("GitSignsChange", { fg = p.warn })
  set("GitSignsDelete", { fg = p.error })
  link("GitSignsAddNr", "GitSignsAdd")
  link("GitSignsChangeNr", "GitSignsChange")
  link("GitSignsDeleteNr", "GitSignsDelete")
  for group in pairs(vim.api.nvim_get_hl(0, {})) do
    if group:match("^GitSignsStaged") then
      local color = p.ok
      if group:find("Delete") or group:find("Topdelete") then
        color = p.error
      elseif group:find("Change") then
        color = p.warn
      end
      set(group, { fg = color })
    end
  end

  surface("TroubleNormal")
  surface("TroubleNormalNC", p.punct)
  set("TroubleCount", { fg = p.accent, bold = true })
  set("TroubleText", { fg = p.punct })
  set("TroubleSource", { fg = p.comment })
  set("TodoBgTODO", { fg = p.warn, bold = true })
  set("TodoFgTODO", { fg = p.warn })
  set("TodoSignTODO", { fg = p.warn })
  set("TodoBgFIX", { fg = p.error, bold = true })
  set("TodoFgFIX", { fg = p.error })
  set("TodoSignFIX", { fg = p.error })
  for kind, color in pairs({ HACK = p.accent, WARN = p.warn, PERF = p.warn, NOTE = p.func, TEST = p.warn }) do
    set("TodoBg" .. kind, { fg = color, bg = background, bold = true })
    set("TodoFg" .. kind, { fg = color })
    set("TodoSign" .. kind, { fg = color })
  end

  surface("BlinkCmpMenu")
  set("BlinkCmpMenuSelection", { fg = p.accent, bg = background, bold = true, underline = true })
  set("BlinkCmpLabel", { fg = p.paper })
  set("BlinkCmpLabelMatch", { fg = p.accent, bold = true })
  set("BlinkCmpLabelDeprecated", { fg = p.gutter, strikethrough = true })
  set("BlinkCmpKind", { fg = p.type })
  set("BlinkCmpSource", { fg = p.comment })
  surface("BlinkCmpDoc", p.punct)
  surface("BlinkCmpDocBorder", p.accent)
  surface("BlinkCmpSignatureHelp", p.punct)
  surface("BlinkCmpSignatureHelpBorder", p.accent)

  surface("NoiceCmdlinePopup")
  surface("NoiceCmdlinePopupBorder", p.accent)
  surface("NoicePopup", p.paper)
  surface("NoicePopupBorder", p.accent)
  surface("NoiceConfirm", p.paper)
  surface("NoiceConfirmBorder", p.accent)
  set("NoiceCmdlineIcon", { fg = p.accent })
  set("NoiceFormatTitle", { fg = p.accent, bold = true })

  for kind, color in pairs({ ERROR = p.error, WARN = p.warn, INFO = p.info, DEBUG = p.comment, TRACE = p.func }) do
    set("Notify" .. kind .. "Border", { fg = color, bg = background })
    set("Notify" .. kind .. "Icon", { fg = color, bg = background })
    set("Notify" .. kind .. "Title", { fg = color, bg = background, bold = true })
    set("Notify" .. kind .. "Body", { fg = p.punct, bg = background })
  end

  set("SnacksDashboardHeader", { fg = p.accent, bold = true })
  set("SnacksDashboardIcon", { fg = p.accent })
  set("SnacksDashboardKey", { fg = p.accent, bold = true })
  set("SnacksDashboardDesc", { fg = p.punct })
  set("SnacksDashboardDir", { fg = p.comment })
  set("SnacksDashboardFooter", { fg = p.comment, italic = true })
  set("SnacksIndent", { fg = p.guide })
  set("SnacksIndentScope", { fg = p.accent })
  surface("SnacksNormal")
  surface("SnacksNormalNC", p.punct)
  surface("SnacksNotifierInfo", p.punct)
  surface("SnacksNotifierWarn", p.punct)
  surface("SnacksNotifierError", p.punct)
  set("SnacksNotifierInfoTitle", { fg = p.info, bold = true })
  set("SnacksNotifierWarnTitle", { fg = p.warn, bold = true })
  set("SnacksNotifierErrorTitle", { fg = p.error, bold = true })
  set("SnacksNotifierInfoBorder", { fg = p.info, bg = background })
  set("SnacksNotifierWarnBorder", { fg = p.warn, bg = background })
  set("SnacksNotifierErrorBorder", { fg = p.error, bg = background })

  surface("LazyNormal")
  set("LazyH1", { fg = p.accent, bg = background, bold = true })
  set("LazyH2", { fg = p.accent, bold = true })
  set("LazyButton", { fg = p.punct, bg = background })
  set("LazyButtonActive", { fg = p.accent, bg = background, bold = true, underline = true })
  set("LazySpecial", { fg = p.type })
  set("LazyProgressDone", { fg = p.ok })
  set("LazyProgressTodo", { fg = p.gutter })
  set("LazyReasonPlugin", { fg = p.info })
  set("LazyReasonEvent", { fg = p.warn })
  set("LazyReasonKeys", { fg = p.accent })
  set("LazyReasonCmd", { fg = p.type })

  set("DevIconDefault", { fg = p.comment })
  for group in pairs(vim.api.nvim_get_hl(0, {})) do
    if group:match("^DevIcon") then
      set(group, { fg = p.comment })
    end
  end
  set("fzf1", { fg = p.accent, bg = background })
  set("fzf2", { fg = p.ok, bg = background })
  set("fzf3", { fg = p.punct, bg = background })
end

function M.terminal()
  local colors = {
    p.ansi.black,
    p.ansi.red,
    p.ansi.green,
    p.ansi.yellow,
    p.ansi.blue,
    p.ansi.magenta,
    p.ansi.cyan,
    p.ansi.white,
    p.ansi.brightBlack,
    p.ansi.brightRed,
    p.ansi.brightGreen,
    p.ansi.brightYellow,
    p.ansi.brightBlue,
    p.ansi.brightMagenta,
    p.ansi.brightCyan,
    p.ansi.brightWhite,
  }

  for index, color in ipairs(colors) do
    vim.g["terminal_color_" .. (index - 1)] = color
  end
end

return M
