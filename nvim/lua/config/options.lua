local opt = vim.opt

opt.number = true
opt.relativenumber = true
opt.cursorline = true
opt.signcolumn = "yes"
opt.colorcolumn = "100"

opt.mouse = "a"
opt.clipboard = "unnamedplus"
opt.undofile = true
opt.confirm = true
opt.updatetime = 200
opt.timeoutlen = 400

opt.splitright = true
opt.splitbelow = true
opt.scrolloff = 8
opt.sidescrolloff = 8

opt.tabstop = 2
opt.shiftwidth = 2
opt.expandtab = true
opt.smartindent = true
opt.wrap = false

opt.ignorecase = true
opt.smartcase = true
opt.inccommand = "split"

opt.termguicolors = true
opt.showmode = false
opt.laststatus = 3
opt.statusline = " %f %m%= %l:%c "
opt.pumheight = 12
opt.shortmess:append("I")
opt.completeopt = { "menu", "menuone", "noselect" }
opt.fillchars = {
  eob = " ",
  fold = " ",
  foldclose = ">",
  foldopen = "v",
  foldsep = " ",
}

vim.diagnostic.config({
  severity_sort = true,
  signs = true,
  underline = true,
  update_in_insert = false,
  virtual_text = { spacing = 3, prefix = ">" },
  float = { border = "rounded", source = true },
})
