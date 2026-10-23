local group = vim.api.nvim_create_augroup("gildrb_config", { clear = true })

vim.api.nvim_create_autocmd("TextYankPost", {
  group = group,
  desc = "Briefly highlight yanked text",
  callback = function()
    vim.highlight.on_yank({ higroup = "IncSearch", timeout = 150 })
  end,
})

local indent = require("config.languages").indent
vim.api.nvim_create_autocmd("FileType", {
  group = group,
  pattern = vim.tbl_keys(indent),
  desc = "Indent as the language's formatter does",
  callback = function(event)
    local style = indent[event.match]
    local buffer = vim.bo[event.buf]
    buffer.expandtab = style.tabs ~= true
    buffer.tabstop = style.width
    buffer.shiftwidth = style.width
    buffer.softtabstop = -1
  end,
})

local function autosave(buffer)
  local path = vim.api.nvim_buf_get_name(buffer)
  local options = vim.bo[buffer]
  if not options.modified or options.buftype ~= "" or path == "" or options.readonly or not options.modifiable then
    return
  end
  -- A file renamed or deleted outside Neovim stays gone; :w recreates it on purpose.
  if vim.b[buffer].autosave_new ~= true and vim.uv.fs_stat(path) == nil then
    if vim.b[buffer].autosave_warned ~= true then
      vim.b[buffer].autosave_warned = true
      vim.notify(
        vim.fn.fnamemodify(path, ":~:.") .. " is gone from disk. Not saved. :w writes it again.",
        vim.log.levels.WARN
      )
    end
    return
  end
  vim.b[buffer].autosaving = true
  local ok, message = pcall(vim.api.nvim_buf_call, buffer, function()
    vim.cmd("silent update")
  end)
  vim.b[buffer].autosaving = false
  if not ok then
    vim.notify("Autosave failed for " .. vim.fn.fnamemodify(path, ":~:.") .. ": " .. message, vim.log.levels.ERROR)
  end
end

vim.api.nvim_create_autocmd("BufNewFile", {
  group = group,
  desc = "Allow autosave to create a new file",
  callback = function(event)
    vim.b[event.buf].autosave_new = true
  end,
})

vim.api.nvim_create_autocmd("BufWritePost", {
  group = group,
  desc = "The file exists on disk now",
  callback = function(event)
    vim.b[event.buf].autosave_new = false
    vim.b[event.buf].autosave_warned = false
  end,
})

vim.api.nvim_create_autocmd({ "InsertLeave", "TextChanged" }, {
  group = group,
  desc = "Save the current file after each change",
  callback = function(event)
    autosave(event.buf)
  end,
})

vim.api.nvim_create_autocmd({ "BufLeave", "FocusLost", "VimLeavePre" }, {
  group = group,
  desc = "Save every changed file when leaving it or Neovim",
  callback = function()
    for _, buffer in ipairs(vim.api.nvim_list_bufs()) do
      if vim.api.nvim_buf_is_loaded(buffer) then
        autosave(buffer)
      end
    end
  end,
})

vim.api.nvim_create_autocmd({ "FocusGained", "BufEnter", "CursorHold" }, {
  group = group,
  desc = "Reload files changed outside Neovim",
  callback = function()
    -- :checktime is not allowed in the command-line window.
    if vim.fn.getcmdwintype() == "" then
      vim.cmd.checktime()
    end
  end,
})

vim.api.nvim_create_autocmd("FileChangedShellPost", {
  group = group,
  desc = "Report a file reloaded from disk",
  callback = function(event)
    vim.notify("Reloaded " .. vim.fn.fnamemodify(event.file, ":~:."), vim.log.levels.INFO)
  end,
})

vim.api.nvim_create_autocmd("BufReadPost", {
  group = group,
  desc = "Return to the last edit position",
  callback = function(event)
    local mark = vim.api.nvim_buf_get_mark(event.buf, '"')
    local line_count = vim.api.nvim_buf_line_count(event.buf)
    if mark[1] > 0 and mark[1] <= line_count then
      pcall(vim.api.nvim_win_set_cursor, 0, mark)
    end
  end,
})

vim.api.nvim_create_autocmd({ "BufEnter", "WinEnter" }, {
  group = group,
  desc = "Keep hybrid line numbers in normal buffers",
  callback = function()
    if vim.bo.buftype ~= "" then
      return
    end

    vim.wo.number = true
    vim.wo.relativenumber = true
  end,
})

vim.api.nvim_create_autocmd("FileType", {
  group = group,
  pattern = { "help", "man", "qf", "checkhealth" },
  desc = "Close utility windows with q",
  callback = function(event)
    vim.keymap.set("n", "q", "<cmd>close<cr>", { buffer = event.buf, silent = true })
  end,
})

vim.api.nvim_create_autocmd("FileType", {
  group = group,
  pattern = "lazy",
  desc = "Close the plugin manager with Escape or q",
  callback = function(event)
    local close = "<cmd>close<cr>"
    vim.keymap.set("n", "<Esc>", close, { buffer = event.buf, silent = true })
    vim.keymap.set("n", "q", close, { buffer = event.buf, silent = true })
  end,
})

vim.api.nvim_create_autocmd("VimEnter", {
  group = group,
  desc = "Show the start menu for a bare nvim",
  callback = function()
    -- `nvim <folder>` finds a file or restores the session (plugins/editor.lua).
    if vim.fn.argc() ~= 0 or vim.api.nvim_buf_get_name(0) ~= "" or vim.bo.modified then
      return
    end

    local buffer = vim.api.nvim_get_current_buf()
    local lines = {
      "Find file       f",
      "New file        n",
      "Files           e",
      "Find text       g",
      "Recent files    r",
      "Plugin manager  l",
      "Quit            q",
    }

    vim.bo[buffer].buftype = "nofile"
    vim.bo[buffer].bufhidden = "wipe"
    vim.bo[buffer].swapfile = false
    vim.bo[buffer].modifiable = true
    vim.api.nvim_buf_set_lines(buffer, 0, -1, false, lines)
    vim.bo[buffer].modifiable = false
    vim.bo[buffer].filetype = "amber-dashboard"
    vim.wo.number = false
    vim.wo.relativenumber = false
    vim.wo.cursorline = false
    vim.wo.signcolumn = "no"
    vim.wo.colorcolumn = ""

    local actions = {
      f = "<cmd>lua require('fff').find_files()<cr>",
      n = "<cmd>enew<cr>",
      e = "<cmd>Oil<cr>",
      g = "<cmd>lua require('fff').live_grep()<cr>",
      r = "<cmd>FzfLua oldfiles<cr>",
      l = "<cmd>Lazy<cr>",
      q = "<cmd>qa<cr>",
    }
    for key, action in pairs(actions) do
      vim.keymap.set("n", key, action, { buffer = buffer, silent = true })
    end
  end,
})
