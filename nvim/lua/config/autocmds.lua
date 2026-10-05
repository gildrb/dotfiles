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

local watchers = {}
local pending = {}

local function check(buffer)
  -- :checktime is not allowed in the command-line window; BufEnter checks after it closes.
  if vim.fn.getcmdwintype() ~= "" then
    return
  end
  if buffer then
    vim.cmd.checktime(buffer)
  else
    vim.cmd.checktime()
  end
end

local function unwatch(buffer)
  local watcher = watchers[buffer]
  if watcher then
    watcher:stop()
    watcher:close()
    watchers[buffer] = nil
  end
end

local function watch(buffer)
  unwatch(buffer)
  local path = vim.api.nvim_buf_get_name(buffer)
  if vim.bo[buffer].buftype ~= "" or path == "" or vim.fn.filereadable(path) ~= 1 then
    return
  end

  local watcher, create_error = vim.uv.new_fs_event()
  if not watcher then
    vim.notify("Cannot watch " .. path .. ": " .. create_error, vim.log.levels.WARN)
    return
  end
  local ok, start_error = watcher:start(
    path,
    {},
    vim.schedule_wrap(function(event_error, _, events)
      if event_error then
        vim.notify("Stopped watching " .. path .. ": " .. event_error, vim.log.levels.WARN)
        unwatch(buffer)
        return
      end
      -- One save can fire several events; check once, after the writer is done.
      local first = pending[buffer] == nil
      pending[buffer] = pending[buffer] == true or events.rename == true
      if not first then
        return
      end
      vim.defer_fn(function()
        local replaced = pending[buffer]
        pending[buffer] = nil
        if not vim.api.nvim_buf_is_valid(buffer) then
          unwatch(buffer)
          return
        end
        -- Atomic saves replace the file; watch the new one at the same path.
        if replaced then
          watch(buffer)
        end
        check(buffer)
      end, 100)
    end)
  )
  if not ok then
    watcher:close()
    vim.notify("Cannot watch " .. path .. ": " .. start_error, vim.log.levels.WARN)
    return
  end
  watchers[buffer] = watcher
end

vim.api.nvim_create_autocmd({ "BufReadPost", "BufWritePost", "BufFilePost" }, {
  group = group,
  desc = "Reload a file as soon as it changes on disk",
  callback = function(event)
    watch(event.buf)
  end,
})

vim.api.nvim_create_autocmd("BufUnload", {
  group = group,
  desc = "Stop watching an unloaded file",
  callback = function(event)
    unwatch(event.buf)
  end,
})

vim.api.nvim_create_autocmd({ "FocusGained", "BufEnter" }, {
  group = group,
  desc = "Check for outside changes the watcher cannot see (network mounts)",
  callback = function()
    check()
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
  desc = "Show the lightweight start guide, also for a directory argument",
  callback = function()
    local directory = vim.fn.argc() == 1 and vim.fn.isdirectory(vim.fn.argv(0)) == 1
    if directory then
      local directory_buffer = vim.api.nvim_get_current_buf()
      vim.cmd.cd(vim.fn.fnameescape(vim.fn.argv(0)))
      vim.cmd.enew()
      vim.api.nvim_buf_delete(directory_buffer, { force = true })
    elseif vim.fn.argc() ~= 0 or vim.api.nvim_buf_get_name(0) ~= "" or vim.bo.modified then
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
    vim.bo[buffer].filetype = "dusk-apple-dashboard"
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
