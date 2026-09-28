local M = {}

local clangd_command = vim.env.NIX_CLANGD
if not clangd_command or clangd_command == "" then
  clangd_command = "clangd"
end

local clangd_query_driver = table.concat({
  "/nix/store/*/bin/cc",
  "/nix/store/*/bin/c++",
  "/nix/store/*/bin/clang*",
  "/nix/store/*/bin/gcc*",
  "/nix/store/*/bin/g++*",
  "/run/current-system/sw/bin/cc",
  "/run/current-system/sw/bin/c++",
  "/run/current-system/sw/bin/clang*",
  "/run/current-system/sw/bin/gcc*",
  "/run/current-system/sw/bin/g++*",
  "/etc/profiles/per-user/*/bin/cc",
  "/etc/profiles/per-user/*/bin/c++",
  "/etc/profiles/per-user/*/bin/clang*",
  "/etc/profiles/per-user/*/bin/gcc*",
  "/etc/profiles/per-user/*/bin/g++*",
}, ",")

-- nixd completes options from the machine configuration flake in ~/nix.
local nix_flake = string.format('(builtins.getFlake "git+file://%s")', vim.fs.normalize("~/nix"))
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
  "lua",
  "luadoc",
  "markdown",
  "markdown_inline",
  "nix",
  "nu",
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
  clangd = {
    cmd = {
      clangd_command,
      "--query-driver=" .. clangd_query_driver,
    },
  },
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
  nixd = {
    settings = {
      nixd = {
        nixpkgs = { expr = "import " .. nix_flake .. ".inputs.nixpkgs { }" },
        options = {
          nixos = { expr = nix_flake .. ".nixosConfigurations.server.options" },
          home_manager = {
            expr = nix_flake .. ".nixosConfigurations.server.options.home-manager.users.type.getSubOptions [ ]",
          },
          nix_darwin = { expr = nix_flake .. ".darwinConfigurations.macbook.options" },
        },
      },
    },
  },
  nushell = {},
  oxlint = {},
  ruff = {
    -- ty owns hover; Ruff's only documents noqa codes.
    on_attach = function(client)
      client.server_capabilities.hoverProvider = false
    end,
  },
  rust_analyzer = {},
  taplo = {},
  tsc = {},
  ty = {},
  yamlls = {},
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
