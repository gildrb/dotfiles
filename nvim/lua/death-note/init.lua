local M = {}
local p = require("death-note.palette")

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
  vim.g.colors_name = "death-note"

  local background = vim.g.death_note_transparent == false and p.ink or "NONE"

  set("Normal", { fg = p.paper, bg = background })
  set("NormalNC", { fg = p.bone, bg = background })
  set("NormalFloat", { fg = p.paper, bg = background })
  set("NormalSB", { fg = p.bone, bg = background })
  set("MsgArea", { fg = p.paper, bg = background })
  set("MsgSeparator", { fg = p.crimson, bg = background })
  set("FloatBorder", { fg = p.crimson, bg = background })
  set("FloatTitle", { fg = p.red_bright, bg = background, bold = true })
  set("WinSeparator", { fg = p.crimson, bg = background })
  set("EndOfBuffer", { fg = p.ink, bg = background })
  set("NonText", transparent(p.dim))
  set("Whitespace", transparent(p.dim))
  set("SpecialKey", transparent(p.steel))
  set("SignColumn", { fg = p.steel, bg = background })
  set("FoldColumn", { fg = p.steel, bg = background })
  set("Folded", { fg = p.steel, bg = background, italic = true })
  set("LineNr", { fg = p.dim, bg = background })
  set("LineNrAbove", { fg = p.dim, bg = background })
  set("LineNrBelow", { fg = p.dim, bg = background })
  set("CursorLine", { bg = background })
  set("CursorColumn", { bg = background })
  set("CursorLineNr", { fg = p.red_bright, bg = background, bold = true })
  set("CursorLineSign", { fg = p.red_bright, bg = background })
  set("CursorLineFold", { fg = p.red_bright, bg = background })
  set("ColorColumn", { bg = background })
  set("Visual", { fg = p.paper, bg = p.crimson })
  set("VisualNOS", { fg = p.paper, bg = p.crimson })
  set("Search", { fg = p.ink, bg = p.gold })
  set("IncSearch", { fg = p.ink, bg = p.red_bright })
  link("CurSearch", "IncSearch")
  set("Substitute", { fg = p.ink, bg = p.red_bright, bold = true })
  set("MatchParen", { fg = p.red_bright, bold = true, underline = true })
  set("Directory", { fg = p.blue, bold = true })
  set("Title", { fg = p.red_bright, bold = true })
  set("Question", { fg = p.green })
  set("MoreMsg", { fg = p.green })
  set("ModeMsg", { fg = p.bone, bold = true })
  set("WarningMsg", { fg = p.gold })
  set("ErrorMsg", { fg = p.red_bright, bold = true })
  set("Conceal", { fg = p.steel })
  set("QuickFixLine", { fg = p.red_bright, bold = true })

  set("Pmenu", { fg = p.paper, bg = background })
  set("PmenuSel", { fg = p.red_bright, bg = background, bold = true, underline = true })
  set("PmenuKind", { fg = p.cyan, bg = background })
  set("PmenuKindSel", { fg = p.red_bright, bg = background, bold = true })
  set("PmenuExtra", { fg = p.steel, bg = background })
  set("PmenuExtraSel", { fg = p.bone, bg = background })
  set("PmenuSbar", { bg = background })
  set("PmenuThumb", { bg = p.crimson })
  set("StatusLine", { fg = p.bone, bg = background })
  set("StatusLineNC", { fg = p.steel, bg = background })
  set("WinBar", { fg = p.paper, bg = background, bold = true })
  set("WinBarNC", { fg = p.steel, bg = background })
  set("TabLine", { fg = p.steel, bg = background })
  set("TabLineFill", { fg = p.dim, bg = background })
  set("TabLineSel", { fg = p.red_bright, bg = background, bold = true })
  set("WildMenu", { fg = p.red_bright, bg = background, bold = true })

  set("Comment", { fg = p.comment, italic = true })
  set("Constant", { fg = p.paper })
  set("String", { fg = p.string })
  link("Character", "String")
  set("Number", { fg = p.paper })
  set("Boolean", { fg = p.paper })
  link("Float", "Number")
  set("Identifier", { fg = p.paper })
  set("Function", { fg = p.blue })
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
  link("Macro", "Keyword")
  link("PreCondit", "Keyword")
  set("Type", { fg = p.paper })
  link("StorageClass", "Type")
  link("Structure", "Type")
  link("Typedef", "Type")
  set("Special", { fg = p.paper })
  set("SpecialChar", { fg = p.string })
  set("Tag", { fg = p.string })
  set("Delimiter", { fg = p.punctuation })
  set("SpecialComment", { fg = p.comment, italic = true })
  set("Debug", { fg = p.red_bright })
  set("Underlined", { fg = p.blue, underline = true })
  set("Todo", { fg = p.gold, bold = true })
  set("Error", { fg = p.red_bright, bold = true })

  set("DiagnosticError", { fg = p.red_bright })
  set("DiagnosticWarn", { fg = p.gold })
  set("DiagnosticInfo", { fg = p.blue })
  set("DiagnosticHint", { fg = p.cyan })
  set("DiagnosticOk", { fg = p.green })
  link("DiagnosticVirtualTextError", "DiagnosticError")
  link("DiagnosticVirtualTextWarn", "DiagnosticWarn")
  link("DiagnosticVirtualTextInfo", "DiagnosticInfo")
  link("DiagnosticVirtualTextHint", "DiagnosticHint")
  set("DiagnosticUnderlineError", { undercurl = true, sp = p.red_bright })
  set("DiagnosticUnderlineWarn", { undercurl = true, sp = p.gold })
  set("DiagnosticUnderlineInfo", { undercurl = true, sp = p.blue })
  set("DiagnosticUnderlineHint", { undercurl = true, sp = p.cyan })
  set("DiagnosticUnderlineOk", { undercurl = true, sp = p.green })
  set("DiagnosticDeprecated", { strikethrough = true, sp = p.dim })
  set("DiagnosticUnnecessary", { fg = p.dim })

  M.treesitter()
  M.semantic_tokens()

  set("DiffAdd", { fg = p.green })
  set("DiffChange", { fg = p.gold })
  set("DiffDelete", { fg = p.red_bright })
  set("DiffText", { fg = p.paper, bold = true, underline = true, sp = p.gold })
  set("diffAdded", { fg = p.green })
  set("diffRemoved", { fg = p.red_bright })
  set("diffChanged", { fg = p.gold })
  set("diffLine", { fg = p.steel })
  set("diffSubname", { fg = p.dim })
  set("diffFile", { fg = p.red_bright, bold = true })
  set("diffIndexLine", { fg = p.purple })
  set("diffOldFile", { fg = p.red_bright })
  set("diffNewFile", { fg = p.green })
  link("Added", "DiffAdd")
  link("Changed", "DiffChange")
  link("Removed", "DiffDelete")

  set("SpellBad", { undercurl = true, sp = p.red_bright })
  set("SpellCap", { undercurl = true, sp = p.gold })
  set("SpellLocal", { undercurl = true, sp = p.blue })
  set("SpellRare", { undercurl = true, sp = p.purple })
  set("healthError", { fg = p.red_bright })
  set("healthWarning", { fg = p.gold })
  set("healthSuccess", { fg = p.green })
  set("OkMsg", { fg = p.green })
  set("FloatShadow", { bg = background })
  set("FloatShadowThrough", { bg = background })
  set("NvimInternalError", { fg = p.red_bright, bg = background })
  set("RedrawDebugClear", { fg = p.gold, bg = background })
  set("RedrawDebugComposed", { fg = p.green, bg = background })
  set("RedrawDebugRecompose", { fg = p.red_bright, bg = background })

  M.plugins(background)
  M.terminal()

  local group = vim.api.nvim_create_augroup("death_note_theme", { clear = true })
  vim.api.nvim_create_autocmd("User", {
    group = group,
    pattern = "LazyLoad",
    desc = "Keep lazy-loaded plugins inside the Death Note palette",
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
    ["@constant.macro"] = "Macro",
    ["@constructor"] = "Function",
    ["@function"] = "Function",
    ["@function.builtin"] = "Function",
    ["@function.call"] = "Function",
    ["@function.macro"] = "Macro",
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
    ["@punctuation.special"] = "Special",
    ["@string"] = "String",
    ["@string.documentation"] = "SpecialComment",
    ["@string.escape"] = "SpecialChar",
    ["@string.regexp"] = "Special",
    ["@string.special"] = "Special",
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
    ["@variable.parameter"] = "Identifier",
    ["@variable.parameter.builtin"] = "Special",
  }

  for group, target in pairs(links) do
    link(group, target)
  end

  set("@variable", { fg = p.paper })
  set("@variable.builtin", { fg = p.paper })
  set("@variable.parameter", { fg = p.paper })
  set("@variable.member", { fg = p.paper })
  set("@property", { fg = p.paper })
  set("@function.builtin", { fg = p.blue })
  set("@type.builtin", { fg = p.paper })
  set("@keyword.return", { fg = p.keyword })
  set("@markup.heading", { fg = p.red_bright, bold = true })
  set("@markup.link.url", { fg = p.steel, underline = true })
  set("@markup.quote", { fg = p.bone, italic = true })
  set("@markup.strong", { fg = p.paper, bold = true })
  set("@markup.italic", { fg = p.bone, italic = true })
  set("@diff.plus", { fg = p.green })
  set("@diff.minus", { fg = p.red_bright })
  set("@diff.delta", { fg = p.gold })
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
    ["@lsp.type.parameter"] = "@variable.parameter",
    ["@lsp.type.property"] = "@property",
    ["@lsp.type.regexp"] = "Special",
    ["@lsp.type.string"] = "String",
    ["@lsp.type.struct"] = "Type",
    ["@lsp.type.type"] = "Type",
    ["@lsp.type.typeParameter"] = "Type",
    ["@lsp.type.variable"] = "@variable",
  }

  for group, target in pairs(links) do
    link(group, target)
  end

  set("@lsp.typemod.variable.readonly", { fg = p.paper })
  set("@lsp.typemod.variable.defaultLibrary", { fg = p.paper })
  set("@lsp.typemod.function.defaultLibrary", { fg = p.blue })
  set("@lsp.mod.deprecated", { strikethrough = true, sp = p.dim })
end

function M.plugins(background)
  local function surface(group, foreground)
    set(group, { fg = foreground or p.paper, bg = background })
  end

  surface("NvimTreeNormal", p.bone)
  surface("NvimTreeNormalNC", p.steel)
  surface("NvimTreeEndOfBuffer", p.ink)
  set("NvimTreeRootFolder", { fg = p.red_bright, bold = true })
  set("NvimTreeFolderName", { fg = p.blue })
  set("NvimTreeFolderIcon", { fg = p.blue })
  set("NvimTreeOpenedFolderName", { fg = p.blue, bold = true })
  set("NvimTreeIndentMarker", { fg = p.dim })
  surface("NvimTreeWinSeparator", p.crimson)
  set("NvimTreeGitDirty", { fg = p.gold })
  set("NvimTreeGitNew", { fg = p.green })
  set("NvimTreeGitDeleted", { fg = p.red_bright })
  set("NvimTreeSpecialFile", { fg = p.cyan })
  set("NvimTreeSymlink", { fg = p.purple })
  set("NvimTreeWindowPicker", { fg = p.red_bright, bg = background, bold = true })

  surface("FzfLuaNormal")
  surface("FzfLuaBorder", p.crimson)
  surface("FzfLuaTitle", p.red_bright)
  set("FzfLuaTitle", { fg = p.red_bright, bg = background, bold = true })
  set("FzfLuaCursor", { fg = p.red_bright, bg = background, bold = true })
  set("FzfLuaSearch", { fg = p.gold, bold = true })
  set("FzfLuaPath", { fg = p.steel })
  set("FzfLuaPathColNr", { fg = p.cyan })
  set("FzfLuaPathLineNr", { fg = p.green })
  set("FzfLuaBufNr", { fg = p.bone })
  set("FzfLuaBufFlagCur", { fg = p.red_bright })
  set("FzfLuaBufFlagAlt", { fg = p.steel })
  set("FzfLuaTabTitle", { fg = p.blue })
  set("FzfLuaTabMarker", { fg = p.red_bright })
  set("FzfLuaLivePrompt", { fg = p.red_bright })
  set("FzfLuaLiveSym", { fg = p.red_bright })
  set("FzfLuaBackdrop", { bg = background })
  set("FzfLuaHeaderBind", { fg = p.red_bright })
  set("FzfLuaHeaderText", { fg = p.bone })

  set("WhichKey", { fg = p.red_bright })
  set("WhichKeyGroup", { fg = p.blue })
  set("WhichKeyDesc", { fg = p.paper })
  set("WhichKeySeparator", { fg = p.dim })
  set("WhichKeyIcon", { fg = p.crimson })
  set("WhichKeyNormal", { fg = p.paper, bg = background })

  set("GitSignsAdd", { fg = p.green })
  set("GitSignsChange", { fg = p.gold })
  set("GitSignsDelete", { fg = p.red_bright })
  link("GitSignsAddNr", "GitSignsAdd")
  link("GitSignsChangeNr", "GitSignsChange")
  link("GitSignsDeleteNr", "GitSignsDelete")
  for group in pairs(vim.api.nvim_get_hl(0, {})) do
    if group:match("^GitSignsStaged") then
      local color = p.green
      if group:find("Delete") or group:find("Topdelete") then
        color = p.red_bright
      elseif group:find("Change") then
        color = p.gold
      end
      set(group, { fg = color })
    end
  end

  surface("TroubleNormal")
  surface("TroubleNormalNC", p.bone)
  set("TroubleCount", { fg = p.red_bright, bold = true })
  set("TroubleText", { fg = p.bone })
  set("TroubleSource", { fg = p.steel })
  set("TodoBgTODO", { fg = p.gold, bold = true })
  set("TodoFgTODO", { fg = p.gold })
  set("TodoSignTODO", { fg = p.gold })
  set("TodoBgFIX", { fg = p.red_bright, bold = true })
  set("TodoFgFIX", { fg = p.red_bright })
  set("TodoSignFIX", { fg = p.red_bright })
  for kind, color in pairs({ HACK = p.red_bright, WARN = p.gold, PERF = p.orange, NOTE = p.cyan, TEST = p.orange }) do
    set("TodoBg" .. kind, { fg = color, bg = background, bold = true })
    set("TodoFg" .. kind, { fg = color })
    set("TodoSign" .. kind, { fg = color })
  end

  surface("BlinkCmpMenu")
  set("BlinkCmpMenuSelection", { fg = p.red_bright, bg = background, bold = true, underline = true })
  set("BlinkCmpLabel", { fg = p.paper })
  set("BlinkCmpLabelMatch", { fg = p.red_bright, bold = true })
  set("BlinkCmpLabelDeprecated", { fg = p.dim, strikethrough = true })
  set("BlinkCmpKind", { fg = p.cyan })
  set("BlinkCmpSource", { fg = p.steel })
  surface("BlinkCmpDoc", p.bone)
  surface("BlinkCmpDocBorder", p.crimson)
  surface("BlinkCmpSignatureHelp", p.bone)
  surface("BlinkCmpSignatureHelpBorder", p.crimson)

  surface("NoiceCmdlinePopup")
  surface("NoiceCmdlinePopupBorder", p.crimson)
  surface("NoicePopup", p.paper)
  surface("NoicePopupBorder", p.crimson)
  surface("NoiceConfirm", p.paper)
  surface("NoiceConfirmBorder", p.crimson)
  set("NoiceCmdlineIcon", { fg = p.red_bright })
  set("NoiceFormatTitle", { fg = p.red_bright, bold = true })

  for kind, color in pairs({ ERROR = p.red_bright, WARN = p.gold, INFO = p.blue, DEBUG = p.steel, TRACE = p.purple }) do
    set("Notify" .. kind .. "Border", { fg = color, bg = background })
    set("Notify" .. kind .. "Icon", { fg = color, bg = background })
    set("Notify" .. kind .. "Title", { fg = color, bg = background, bold = true })
    set("Notify" .. kind .. "Body", { fg = p.bone, bg = background })
  end

  set("SnacksDashboardHeader", { fg = p.red_bright, bold = true })
  set("SnacksDashboardIcon", { fg = p.crimson })
  set("SnacksDashboardKey", { fg = p.red_bright, bold = true })
  set("SnacksDashboardDesc", { fg = p.bone })
  set("SnacksDashboardDir", { fg = p.steel })
  set("SnacksDashboardFooter", { fg = p.steel, italic = true })
  set("SnacksIndent", { fg = p.dim })
  set("SnacksIndentScope", { fg = p.crimson })
  surface("SnacksNormal")
  surface("SnacksNormalNC", p.bone)
  surface("SnacksNotifierInfo", p.bone)
  surface("SnacksNotifierWarn", p.bone)
  surface("SnacksNotifierError", p.bone)
  set("SnacksNotifierInfoTitle", { fg = p.blue, bold = true })
  set("SnacksNotifierWarnTitle", { fg = p.gold, bold = true })
  set("SnacksNotifierErrorTitle", { fg = p.red_bright, bold = true })
  set("SnacksNotifierInfoBorder", { fg = p.blue, bg = background })
  set("SnacksNotifierWarnBorder", { fg = p.gold, bg = background })
  set("SnacksNotifierErrorBorder", { fg = p.red_bright, bg = background })

  surface("LazyNormal")
  set("LazyH1", { fg = p.red_bright, bg = background, bold = true })
  set("LazyH2", { fg = p.crimson, bold = true })
  set("LazyButton", { fg = p.bone, bg = background })
  set("LazyButtonActive", { fg = p.red_bright, bg = background, bold = true, underline = true })
  set("LazySpecial", { fg = p.cyan })
  set("LazyProgressDone", { fg = p.green })
  set("LazyProgressTodo", { fg = p.dim })
  set("LazyReasonPlugin", { fg = p.blue })
  set("LazyReasonEvent", { fg = p.gold })
  set("LazyReasonKeys", { fg = p.red_bright })
  set("LazyReasonCmd", { fg = p.cyan })

  set("MasonHeader", { fg = p.red_bright, bg = background, bold = true })
  set("MasonHeaderSecondary", { fg = p.crimson, bg = background, bold = true })
  set("MasonHighlight", { fg = p.red_bright })
  set("MasonHighlightBlock", { fg = p.red_bright, bg = background })
  set("MasonHighlightBlockBold", { fg = p.red_bright, bg = background, bold = true })
  set("MasonMuted", { fg = p.steel })
  set("MasonMutedBlock", { fg = p.steel, bg = background })
  set("MasonError", { fg = p.red_bright })
  set("MasonWarning", { fg = p.gold })
  set("MasonHeading", { fg = p.paper, bold = true })

  set("DevIconDefault", { fg = p.steel })
  for group in pairs(vim.api.nvim_get_hl(0, {})) do
    if group:match("^DevIcon") then
      set(group, { fg = p.steel })
    end
  end
  set("fzf1", { fg = p.red_bright, bg = background })
  set("fzf2", { fg = p.green, bg = background })
  set("fzf3", { fg = p.bone, bg = background })
end

function M.terminal()
  local colors = {
    p.ink,
    p.red,
    p.string,
    p.gold,
    p.blue,
    p.purple,
    p.cyan,
    p.paper,
    p.dim,
    p.red_bright,
    p.green,
    p.gold,
    p.blue,
    p.purple,
    p.cyan,
    p.paper,
  }

  for index, color in ipairs(colors) do
    vim.g["terminal_color_" .. (index - 1)] = color
  end
end

return M
