-- Drop cached modules so `:colorscheme forge` picks up edits live.
package.loaded["forge"] = nil
package.loaded["forge.palette"] = nil
require("forge").load()
