local lazypath = vim.fn.stdpath("data") .. "/lazy/lazy.nvim"
local source_lockfile = vim.fn.stdpath("config") .. "/lazy-lock.json"
local lockfile = vim.fn.stdpath("state") .. "/lazy-lock.json"
if not vim.uv.fs_stat(lockfile) and vim.uv.fs_stat(source_lockfile) then
  vim.fn.mkdir(vim.fn.stdpath("state"), "p")
  vim.fn.writefile(vim.fn.readfile(source_lockfile), lockfile)
end

if not vim.uv.fs_stat(lazypath) then
  local result = vim.fn.system({
    "git",
    "clone",
    "--filter=blob:none",
    "--branch=stable",
    "https://github.com/folke/lazy.nvim.git",
    lazypath,
  })
  if vim.v.shell_error ~= 0 then
    error("Could not install lazy.nvim:\n" .. result)
  end

  local lock = vim.json.decode(table.concat(vim.fn.readfile(lockfile), "\n"))
  local lazy_commit = lock["lazy.nvim"] and lock["lazy.nvim"].commit
  if lazy_commit then
    result = vim.fn.system({ "git", "-C", lazypath, "checkout", "--detach", lazy_commit })
    if vim.v.shell_error ~= 0 then
      error("Could not pin lazy.nvim:\n" .. result)
    end
  end
end

vim.opt.rtp:prepend(lazypath)

require("lazy").setup({
  lockfile = lockfile,
  spec = { { import = "plugins" } },
  defaults = { lazy = true, version = false },
  install = { colorscheme = { "death-note" } },
  checker = { enabled = false },
  change_detection = { notify = false },
  ui = { border = "rounded" },
  performance = {
    rtp = {
      disabled_plugins = {
        "gzip",
        "netrwPlugin",
        "tarPlugin",
        "tohtml",
        "tutor",
        "zipPlugin",
      },
    },
  },
})

vim.cmd.colorscheme("death-note")
