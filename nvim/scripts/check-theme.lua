local palette = require("death-note.palette")
local expected = {
  paper = "#f4ead5",
  ink = "#09090b",
  crimson = "#b30f2f",
  red = "#e31b3b",
  red_bright = "#ff4965",
  steel = "#8fa3c0",
  blue = "#7aa7d9",
  bone = "#d8ccb4",
  green = "#9dcc73",
  gold = "#f5b84b",
  purple = "#b9a3e3",
  cyan = "#8ed9e8",
  orange = "#ff9d5c",
  dim = "#687386",
}

for name, color in pairs(expected) do
  assert(palette[name] == color, ("Death Note palette drifted at %s"):format(name))
end

local allowed = {}
for _, color in pairs(expected) do
  allowed[tonumber(color:sub(2), 16)] = true
end

local leaks = {}
for group, highlight in pairs(vim.api.nvim_get_hl(0, {})) do
  for _, attribute in ipairs({ "fg", "bg", "sp" }) do
    local color = highlight[attribute]
    if color and not allowed[color] then
      table.insert(leaks, ("%s.%s=#%06x"):format(group, attribute, color))
    end
  end
end
table.sort(leaks)
assert(#leaks == 0, "colors outside the Pi Death Note palette:\n" .. table.concat(leaks, "\n"))

for _, group in ipairs({
  "Normal",
  "NormalFloat",
  "StatusLine",
  "NvimTreeNormal",
  "FzfLuaNormal",
  "BlinkCmpMenu",
  "TroubleNormal",
  "LazyNormal",
}) do
  assert(vim.api.nvim_get_hl(0, { name = group }).bg == nil, group .. " must inherit Ghostty transparency")
end
