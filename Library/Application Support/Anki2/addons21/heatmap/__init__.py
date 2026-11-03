from datetime import date, datetime, timedelta
from typing import Final

from aqt import gui_hooks, mw
from aqt.deckbrowser import DeckBrowser, DeckBrowserContent

WEEKS: Final = 53
CELL: Final = 11
GAP: Final = 3
COLOR: Final = "#d4af5d"
LEVELS: Final = (0.3, 0.55, 0.8, 1.0)

# Anki day per review: local time shifted back by the "next day starts at" hour.
# ease 0 marks manual reschedules, not reviews.
QUERY: Final = """
select date(id / 1000, 'unixepoch', 'localtime', ?), count()
from revlog
where ease > 0 and id >= ?
group by 1
"""


def anki_today(rollover: int) -> date:
    return (datetime.now() - timedelta(hours=rollover)).date()


def reviews_per_day(first: date, rollover: int) -> dict[date, int]:
    if mw.col is None:
        raise RuntimeError("heatmap: no collection open")
    start = datetime.combine(first, datetime.min.time()) + timedelta(hours=rollover)
    since_ms = int(start.timestamp() * 1000)
    rows = mw.col.db.all(QUERY, f"-{rollover} hours", since_ms)
    return {date.fromisoformat(day): count for day, count in rows}


def streak(counts: dict[date, int], today: date) -> int:
    day = today if counts.get(today, 0) > 0 else today - timedelta(days=1)
    days = 0
    while counts.get(day, 0) > 0:
        days += 1
        day -= timedelta(days=1)
    return days


def cell(day: date, count: int, peak: int, column: int) -> str:
    x = column * (CELL + GAP)
    y = day.weekday() * (CELL + GAP)
    if count == 0:
        fill = 'fill="currentColor" fill-opacity="0.08"'
    else:
        level = LEVELS[min(len(LEVELS) - 1, (len(LEVELS) * count - 1) // peak)]
        fill = f'fill="{COLOR}" fill-opacity="{level}"'
    label = f"{day.isoformat()}: {count} review{'' if count == 1 else 's'}"
    return f'<rect x="{x}" y="{y}" width="{CELL}" height="{CELL}" rx="2" {fill}><title>{label}</title></rect>'


def render(rollover: int) -> str:
    today = anki_today(rollover)
    first = today - timedelta(days=today.weekday(), weeks=WEEKS - 1)
    counts = reviews_per_day(first, rollover)
    peak = max(counts.values(), default=0)
    cells = [
        cell(
            first + timedelta(days=offset),
            counts.get(first + timedelta(days=offset), 0),
            peak,
            offset // 7,
        )
        for offset in range((today - first).days + 1)
    ]
    width = WEEKS * (CELL + GAP) - GAP
    height = 7 * (CELL + GAP) - GAP
    total = sum(counts.values())
    days = streak(counts, today)
    summary = (
        f"{total} reviews in {WEEKS} weeks, streak {days} day{'' if days == 1 else 's'}"
    )
    return (
        '<div style="margin:24px auto 0;width:fit-content">'
        f'<svg width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-label="{summary}">'
        f"{''.join(cells)}</svg>"
        f'<div style="opacity:.7;font-size:13px;margin-top:6px;text-align:left">{summary}</div>'
        "</div>"
    )


def add_heatmap(_browser: DeckBrowser, content: DeckBrowserContent) -> None:
    if mw.col is None:
        raise RuntimeError("heatmap: no collection open")
    content.stats += render(mw.col.get_preferences().scheduling.rollover)


gui_hooks.deck_browser_will_render_content.append(add_heatmap)
