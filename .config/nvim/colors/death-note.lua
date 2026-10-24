-- Drop cached modules so `:colorscheme death-note` picks up edits live.
package.loaded["death-note"] = nil
package.loaded["death-note.palette"] = nil
require("death-note").load()
