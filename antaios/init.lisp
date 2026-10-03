;;; Dusk Apple semantic styles. ANSI colors come from the terminal palette.
(in-package #:antaios)

;; Keep defaults for roles already mapped to the shared palette. Replace the
;; fixed indexed greens and gray status background; accents use the yellow slots.
;; No bold anywhere: emphasis is color only.
(loop for (name arguments) in
      '((:brand (:foreground :bright-yellow))
        (:child-name (:foreground :blue))
        (:syntax-keyword (:foreground :yellow))
        (:syntax-heading (:foreground :bright-yellow))
        (:status-plain (:foreground :white :background :black))
        (:status-dim (:foreground :bright-black :background :black))
        (:status-accent (:foreground :bright-yellow :background :black))
        (:status-model (:foreground :blue :background :black))
        (:status-effort (:foreground :bright-yellow :background :black))
        (:status-branch (:foreground :green :background :black))
        (:compaction-label (:foreground :yellow :background :black))
        (:compaction-track (:foreground :bright-black :background :black))
        (:compaction-head (:foreground :yellow :background :black)))
      do (setf (cdr (assoc name *terminal-style-table*))
               (apply #'make-style arguments)))
