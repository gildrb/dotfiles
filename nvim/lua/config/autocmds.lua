local group = vim.api.nvim_create_augroup("gildrb_config", { clear = true })

vim.api.nvim_create_autocmd("TextYankPost", {
  group = group,
  desc = "Briefly highlight yanked text",
  callback = function()
    vim.highlight.on_yank({ higroup = "IncSearch", timeout = 150 })
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
  desc = "Show the lightweight start guide",
  callback = function()
    if vim.fn.argc() ~= 0 or vim.api.nvim_buf_get_name(0) ~= "" or vim.bo.modified then
      return
    end

    local buffer = vim.api.nvim_get_current_buf()
    local lines = {
      "Find file       f",
      "New file        n",
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
    vim.bo[buffer].filetype = "death-note-dashboard"
    vim.wo.number = false
    vim.wo.relativenumber = false
    vim.wo.cursorline = false
    vim.wo.signcolumn = "no"
    vim.wo.colorcolumn = ""

    local actions = {
      f = "<cmd>FzfLua files<cr>",
      n = "<cmd>enew<cr>",
      g = "<cmd>FzfLua live_grep<cr>",
      r = "<cmd>FzfLua oldfiles<cr>",
      l = "<cmd>Lazy<cr>",
      q = "<cmd>qa<cr>",
    }
    for key, action in pairs(actions) do
      vim.keymap.set("n", key, action, { buffer = buffer, silent = true })
    end
  end,
})
