vim.g.mapleader = " "
vim.g.maplocalleader = " "

-- Read before plugins load: oil turns a folder argument into an oil:// buffer.
if vim.fn.argc() == 1 and vim.fn.isdirectory(vim.fn.argv(0)) == 1 then
  vim.g.start_folder = { path = vim.fn.fnamemodify(vim.fn.argv(0), ":p"), dot = vim.fn.argv(0) == "." }
end

require("config.options")
require("config.autocmds")
require("config.keymaps")
require("config.lazy")
