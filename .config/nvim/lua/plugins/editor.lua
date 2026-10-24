local function find_files()
  require("fff").find_files()
end

local function live_grep()
  require("fff").live_grep()
end

return {
  {
    -- Files are a buffer: edit names, then :w applies creates, renames and deletes.
    "stevearc/oil.nvim",
    lazy = false,
    opts = {
      default_file_explorer = true,
      delete_to_trash = true,
      skip_confirm_for_simple_edits = false,
      watch_for_changes = true,
      view_options = { show_hidden = true, case_insensitive = true },
      -- LSP servers update imports on rename; oil saves the buffers they change.
      lsp_file_methods = { autosave_changes = true },
      columns = {},
    },
    keys = {
      { "-", "<cmd>Oil<cr>", desc = "Open the folder of this file" },
      { "<leader>e", "<cmd>Oil<cr>", desc = "Open the folder of this file" },
    },
  },
  {
    "dmtrKovalenko/fff",
    -- Built from the pinned commit (lazy-lock.json) and Cargo.lock: no unverified download.
    build = "cargo build --release --locked -p fff-nvim",
    -- The plugin initialises itself on first use.
    lazy = false,
    opts = {
      lazy_sync = true,
      wrap_around = true,
      layout = { prompt_position = "top" },
      grep = { trim_whitespace = true },
      keymaps = {
        move_up = { "<Up>", "<C-p>", "<C-k>" },
        move_down = { "<Down>", "<C-n>", "<C-j>" },
      },
    },
    keys = {
      { "<leader>ff", find_files, desc = "Find files" },
      { "<leader><leader>", find_files, desc = "Find files" },
      { "<leader>fg", live_grep, desc = "Find text" },
      {
        "<leader>fw",
        function()
          require("fff").live_grep_under_cursor()
        end,
        mode = { "n", "x" },
        desc = "Find word or selection",
      },
    },
  },
  {
    "folke/persistence.nvim",
    lazy = false,
    opts = {},
    config = function(_, opts)
      local persistence = require("persistence")
      persistence.setup(opts)
      local group = vim.api.nvim_create_augroup("gildrb_session", { clear = true })

      vim.api.nvim_create_autocmd("VimEnter", {
        group = group,
        desc = "nvim . restores the session of this folder; nvim <folder> finds a file",
        callback = function()
          if vim.fn.argc() == 0 then
            return
          end
          -- Set in init.lua before oil renames the folder argument.
          local folder = vim.g.start_folder
          if folder == nil then
            -- `nvim file` (or the Git commit editor) must not replace the folder session.
            persistence.stop()
            return
          end

          local folder_buffer = vim.api.nvim_get_current_buf()
          vim.fn.chdir(folder.path)
          vim.cmd.enew()
          vim.api.nvim_buf_delete(folder_buffer, { force = true })
          -- After startup: loaded during VimEnter, the first file misses its FileType.
          vim.schedule(function()
            if folder.dot and vim.fn.filereadable(persistence.current()) == 1 then
              persistence.load()
            else
              find_files()
            end
          end)
        end,
      })

      vim.api.nvim_create_autocmd("User", {
        group = group,
        pattern = "PersistenceLoadPost",
        desc = "Drop restored buffers whose file was renamed or deleted",
        callback = function()
          for _, buffer in ipairs(vim.api.nvim_list_bufs()) do
            local path = vim.api.nvim_buf_get_name(buffer)
            if
              vim.bo[buffer].buftype == ""
              and path ~= ""
              and not vim.bo[buffer].modified
              and vim.uv.fs_stat(path) == nil
            then
              vim.api.nvim_buf_delete(buffer, {})
            end
          end
        end,
      })
    end,
  },
  {
    -- Pickers fff does not cover: buffers, recent files across folders, help, LSP lists.
    "ibhagwan/fzf-lua",
    cmd = "FzfLua",
    opts = {
      winopts = {
        height = 0.86,
        width = 0.84,
        row = 0.50,
        col = 0.50,
        border = "rounded",
        preview = { layout = "flex" },
      },
      fzf_opts = { ["--layout"] = "reverse", ["--info"] = "inline-right" },
      files = { file_icons = false, git_icons = false },
    },
    keys = {
      { "<leader>fb", "<cmd>FzfLua buffers<cr>", desc = "Buffers" },
      { "<leader>fr", "<cmd>FzfLua oldfiles<cr>", desc = "Recent files" },
      { "<leader>fh", "<cmd>FzfLua help_tags<cr>", desc = "Help" },
      { "<leader>fk", "<cmd>FzfLua keymaps<cr>", desc = "Keymaps" },
      { "<leader>fc", "<cmd>FzfLua commands<cr>", desc = "Commands" },
      { "<leader>gc", "<cmd>FzfLua git_commits<cr>", desc = "Git commits" },
      { "<leader>gs", "<cmd>FzfLua git_status<cr>", desc = "Git status" },
      { "<leader>/", "<cmd>FzfLua blines<cr>", desc = "Search buffer" },
    },
  },
  {
    "lewis6991/gitsigns.nvim",
    event = { "BufReadPre", "BufNewFile" },
    opts = {
      signs = {
        add = { text = "+" },
        change = { text = "~" },
        delete = { text = "-" },
        topdelete = { text = "-" },
        changedelete = { text = "~" },
      },
      on_attach = function(buffer)
        local gs = require("gitsigns")
        local function map(mode, lhs, rhs, desc)
          vim.keymap.set(mode, lhs, rhs, { buffer = buffer, desc = desc })
        end

        map("n", "]h", gs.next_hunk, "Next Git hunk")
        map("n", "[h", gs.prev_hunk, "Previous Git hunk")
        map("n", "<leader>hp", gs.preview_hunk, "Preview hunk")
        map("n", "<leader>hs", gs.stage_hunk, "Stage hunk")
        map("n", "<leader>hr", gs.reset_hunk, "Reset hunk")
        map("n", "<leader>hb", gs.blame_line, "Blame line")
      end,
    },
  },
  {
    "folke/trouble.nvim",
    cmd = "Trouble",
    opts = { focus = true, icons = false },
    keys = {
      { "<leader>xx", "<cmd>Trouble diagnostics toggle<cr>", desc = "Diagnostics" },
      { "<leader>xX", "<cmd>Trouble diagnostics toggle filter.buf=0<cr>", desc = "Buffer diagnostics" },
      { "<leader>cs", "<cmd>Trouble symbols toggle focus=false<cr>", desc = "Symbols" },
      { "<leader>cl", "<cmd>Trouble lsp toggle focus=false win.position=right<cr>", desc = "LSP references" },
    },
  },
  {
    "sphamba/smear-cursor.nvim",
    event = "VeryLazy",
    opts = {},
  },
  {
    "folke/which-key.nvim",
    event = "VeryLazy",
    opts = {
      icons = { mappings = false },
      win = { border = "rounded" },
      spec = {
        { "<leader>b", group = "buffer" },
        { "<leader>c", group = "code" },
        { "<leader>f", group = "find" },
        { "<leader>g", group = "git" },
        { "<leader>h", group = "hunk" },
        { "<leader>x", group = "diagnostics" },
      },
    },
  },
}
