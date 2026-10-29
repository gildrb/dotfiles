return {
  {
    "kawre/leetcode.nvim",
    -- Loads only for `nvim leetcode.nvim`; every other startup is untouched.
    lazy = vim.fn.argv(0, -1) ~= "leetcode.nvim",
    build = ":TSUpdate html",
    dependencies = {
      "nvim-lua/plenary.nvim",
      "MunifTanjim/nui.nvim",
    },
    opts = {
      arg = "leetcode.nvim",
      lang = "python",
      picker = { provider = "fzf-lua" },
    },
  },
}
