local languages = require("config.languages")

return {
  {
    "saghen/blink.cmp",
    event = "InsertEnter",
    version = "1.*",
    opts = {
      keymap = { preset = "enter" },
      appearance = { nerd_font_variant = "mono" },
      completion = {
        documentation = { auto_show = true, auto_show_delay_ms = 300 },
        menu = { border = "rounded", draw = { treesitter = { "lsp" } } },
      },
      signature = { enabled = true, window = { border = "rounded" } },
      sources = { default = { "lsp", "path", "snippets", "buffer" } },
    },
  },
  {
    "stevearc/conform.nvim",
    event = { "BufWritePre" },
    cmd = { "ConformInfo" },
    opts = {
      default_format_opts = { lsp_format = "fallback" },
      format_on_save = { timeout_ms = 1000, lsp_format = "fallback" },
      formatters_by_ft = languages.formatters_by_ft,
    },
    keys = {
      {
        "<leader>cf",
        function()
          require("conform").format({ async = true, lsp_format = "fallback" })
        end,
        mode = { "n", "v" },
        desc = "Format buffer",
      },
    },
  },
  {
    "windwp/nvim-autopairs",
    event = "InsertEnter",
    opts = { check_ts = true },
  },
  {
    "nvim-treesitter/nvim-treesitter",
    branch = "main",
    build = ":TSUpdate",
    event = { "BufReadPost", "BufNewFile" },
    config = function()
      local treesitter = require("nvim-treesitter")
      treesitter.setup({})

      local function install_parsers()
        if vim.fn.executable("tree-sitter") == 1 then
          treesitter.install(languages.parsers)
        end
      end

      install_parsers()
      vim.api.nvim_create_autocmd("User", {
        pattern = "MasonToolsUpdateCompleted",
        desc = "Install configured Tree-sitter parsers after Mason is ready",
        callback = install_parsers,
      })
      vim.api.nvim_create_autocmd("FileType", {
        desc = "Enable language-aware Tree-sitter highlighting",
        callback = function(event)
          pcall(vim.treesitter.start, event.buf)
        end,
      })
      pcall(vim.treesitter.start, 0)
    end,
  },
  {
    "mason-org/mason.nvim",
    cmd = "Mason",
    opts = {
      ui = {
        border = "rounded",
        icons = { package_installed = "[x]", package_pending = "[...]", package_uninstalled = "[ ]" },
      },
    },
  },
  {
    "neovim/nvim-lspconfig",
    event = { "BufReadPre", "BufNewFile" },
    dependencies = { "saghen/blink.cmp" },
    keys = {
      { "gd", vim.lsp.buf.definition, desc = "Go to definition" },
      { "gr", "<cmd>FzfLua lsp_references<cr>", desc = "References" },
      { "gI", "<cmd>FzfLua lsp_implementations<cr>", desc = "Implementations" },
      { "K", vim.lsp.buf.hover, desc = "Hover documentation" },
      { "<leader>ca", vim.lsp.buf.code_action, mode = { "n", "v" }, desc = "Code action" },
      { "<leader>cr", vim.lsp.buf.rename, desc = "Rename symbol" },
    },
  },
  {
    "mason-org/mason-lspconfig.nvim",
    event = { "BufReadPre", "BufNewFile" },
    dependencies = { "mason-org/mason.nvim", "neovim/nvim-lspconfig" },
    config = function()
      local capabilities = require("blink.cmp").get_lsp_capabilities()
      local mason_servers = vim.tbl_keys(languages.servers)

      if vim.fn.executable("nil") == 1 then
        mason_servers = vim.tbl_filter(function(server)
          return server ~= "nil_ls"
        end, mason_servers)
        vim.lsp.enable("nil_ls")
      end

      for server, options in pairs(languages.servers) do
        vim.lsp.config(server, vim.tbl_deep_extend("force", { capabilities = capabilities }, options))
      end

      require("mason-lspconfig").setup({
        ensure_installed = mason_servers,
        automatic_enable = true,
      })
    end,
  },
  {
    "WhoIsSethDaniel/mason-tool-installer.nvim",
    event = { "BufReadPost", "BufNewFile" },
    dependencies = { "mason-org/mason.nvim", "mason-org/mason-lspconfig.nvim" },
    opts = {
      ensure_installed = languages.tools,
      run_on_start = true,
      start_delay = 1000,
      debounce_hours = 168,
    },
  },
}
