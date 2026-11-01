import json
from typing import Final, Literal

from anki.cards import Card
from aqt import gui_hooks
from aqt.reviewer import Reviewer

SHOW_MS: Final = 900
LABELS: Final[dict[int, tuple[str, str]]] = {
    1: ("Again", "#fe9a86"),
    2: ("Hard", "#e6a960"),
    3: ("Good", "#76c788"),
    4: ("Easy", "#7dbaf8"),
}

SCRIPT: Final = """(() => {
  const [label, color, ms] = %s;
  let pill = document.getElementById("answer-feedback");
  if (!pill) {
    pill = document.createElement("div");
    pill.id = "answer-feedback";
    pill.style.cssText = "position:fixed;left:50%%;bottom:24px;transform:translateX(-50%%);" +
      "padding:6px 16px;border-radius:999px;border:1px solid currentColor;" +
      "background:rgba(14,14,17,.92);font:600 16px/1.5 system-ui,sans-serif;" +
      "pointer-events:none;z-index:2147483647;transition:opacity 200ms ease-out";
    document.body.appendChild(pill);
  }
  pill.textContent = label;
  pill.style.color = color;
  pill.style.opacity = "1";
  clearTimeout(pill.hideTimer);
  pill.hideTimer = setTimeout(() => { pill.style.opacity = "0"; }, ms);
})();"""


def show(reviewer: Reviewer, _card: Card, ease: Literal[1, 2, 3, 4]) -> None:
    label, color = LABELS[ease]
    reviewer.web.eval(SCRIPT % json.dumps([label, color, SHOW_MS]))


gui_hooks.reviewer_did_answer_card.append(show)
