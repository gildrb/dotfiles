local M = {}

M.parsers = {
  "bash",
  "c",
  "cpp",
  "css",
  "diff",
  "git_config",
  "git_rebase",
  "gitattributes",
  "gitcommit",
  "gitignore",
  "html",
  "javascript",
  "json",
  "jsonc",
  "lua",
  "luadoc",
  "markdown",
  "markdown_inline",
  "nix",
  "python",
  "query",
  "regex",
  "rust",
  "toml",
  "tsx",
  "typescript",
  "vim",
  "vimdoc",
  "yaml",
}

M.servers = {
  bashls = {},
  clangd = {},
  cssls = {},
  html = {},
  jsonls = {},
  lua_ls = {
    settings = {
      Lua = {
        diagnostics = { globals = { "vim" } },
        workspace = { checkThirdParty = false },
      },
    },
  },
  marksman = {},
  nil_ls = {},
  pyright = {},
  rust_analyzer = {},
  taplo = {},
  ts_ls = {},
  yamlls = {},
}

M.tools = {
  "nixfmt",
  "prettierd",
  "ruff",
  "shellcheck",
  "shfmt",
  "stylua",
  "tree-sitter-cli",
}

M.formatters_by_ft = {
  bash = { "shfmt" },
  css = { "prettierd", "prettier", stop_after_first = true },
  html = { "prettierd", "prettier", stop_after_first = true },
  javascript = { "prettierd", "prettier", stop_after_first = true },
  javascriptreact = { "prettierd", "prettier", stop_after_first = true },
  json = { "prettierd", "prettier", stop_after_first = true },
  jsonc = { "prettierd", "prettier", stop_after_first = true },
  lua = { "stylua" },
  markdown = { "prettierd", "prettier", stop_after_first = true },
  nix = { "nixfmt" },
  python = { "ruff_format" },
  sh = { "shfmt" },
  typescript = { "prettierd", "prettier", stop_after_first = true },
  typescriptreact = { "prettierd", "prettier", stop_after_first = true },
  yaml = { "prettierd", "prettier", stop_after_first = true },
}

return M
