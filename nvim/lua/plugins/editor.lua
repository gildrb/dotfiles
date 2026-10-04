return {
  {
    "nvim-tree/nvim-tree.lua",
    lazy = false,
    opts = {
      view = { side = "left", width = 32, preserve_window_proportions = true },
      renderer = {
        group_empty = true,
        highlight_git = "name",
        indent_markers = { enable = true },
        icons = {
          show = {
            file = false,
            folder = false,
            folder_arrow = false,
            git = false,
            modified = false,
            diagnostics = false,
            bookmarks = false,
          },
        },
      },
      filters = { dotfiles = false },
      -- The start guide (config/autocmds.lua) takes a directory argument instead.
      hijack_directories = { enable = false },
      git = { enable = true, ignore = false },
      update_focused_file = { enable = true },
    },
    config = function(_, opts)
      require("nvim-tree").setup(opts)
      local api = require("nvim-tree.api")
      local group = vim.api.nvim_create_augroup("gildrb_nvim_tree", { clear = true })

      vim.api.nvim_create_autocmd("VimEnter", {
        group = group,
        desc = "Show the file tree beside the first window",
        callback = function()
          api.tree.open({ find_file = true })
          vim.cmd("noautocmd wincmd p")
        end,
      })

      vim.api.nvim_create_autocmd("QuitPre", {
        group = group,
        desc = "Close the file tree with the last editor window",
        callback = function()
          if vim.bo.filetype == "NvimTree" then
            return
          end
          local editors = 0
          for _, win in ipairs(vim.api.nvim_tabpage_list_wins(0)) do
            local buf = vim.api.nvim_win_get_buf(win)
            if vim.api.nvim_win_get_config(win).relative == "" and vim.bo[buf].filetype ~= "NvimTree" then
              editors = editors + 1
            end
          end
          if editors == 1 then
            api.tree.close_in_this_tab()
          end
        end,
      })
    end,
    keys = {
      { "<C-n>", "<cmd>NvimTreeToggle<cr>", desc = "Toggle file tree" },
      { "<leader>e", "<cmd>NvimTreeFindFile<cr>", desc = "Reveal current file" },
    },
  },
  {
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
      files = { file_icons = false, git_icons = false, hidden = true },
      grep = { rg_glob = true, glob_flag = "--iglob" },
    },
    keys = {
      { "<leader>ff", "<cmd>FzfLua files<cr>", desc = "Find files" },
      { "<leader>fg", "<cmd>FzfLua live_grep<cr>", desc = "Live grep" },
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
}
