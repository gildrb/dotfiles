-- Neovim adapter for theme/death-note.json.
local palette = {
  paper = "#ededed",
  ink = "#09090b",
  crimson = "#a03759",
  select = "#471d2b",
  red_error = "#ff6a6e",
  red_bright = "#fe598f",
  steel = "#a0a0a0",
  dim = "#9a9a9a",
  bone = "#c9c9c9",
  green = "#10c955",
  green_bright = "#5ee9b5",
  gold = "#ffb200",
  gold_bright = "#ffc85e",
  blue = "#5fa5ff",
  blue_bright = "#97ccff",
  purple = "#c674f9",
  cyan = "#52f0db",
  cyan_bright = "#b1f7ec",
  white_bright = "#ffffff",
}

palette.red = palette.red_bright
palette.keyword = palette.red_bright
palette.comment = palette.steel
palette.string = palette.green
palette.callable = palette.purple
palette.variable = palette.blue
palette.number = palette.gold
palette.type = palette.cyan
palette.orange = palette.gold
palette.operator = palette.red_bright
palette.punctuation = palette.paper

return palette
