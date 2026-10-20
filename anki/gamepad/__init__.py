import ctypes
from collections.abc import Callable
from typing import Final

from aqt import gui_hooks, mw
from aqt.qt import QAction, QApplication, QKeySequence, QShortcut, QTimer

POLL_MS: Final = 16
SCREENS: Final = ("deckBrowser", "overview", "question", "answer")
PAD_BUTTONS: Final = (
    "buttonA",
    "buttonB",
    "buttonX",
    "buttonY",
    "leftShoulder",
    "rightShoulder",
    "leftTrigger",
    "rightTrigger",
    "buttonMenu",
    "buttonOptions",
)
DPAD: Final = ("up", "down", "left", "right")
BUTTONS: Final = (*PAD_BUTTONS, *(f"dpad.{d}" for d in DPAD))

ID = ctypes.c_void_p
objc = ctypes.CDLL("/usr/lib/libobjc.A.dylib")
ctypes.CDLL("/System/Library/Frameworks/GameController.framework/GameController")
objc.objc_getClass.restype = ID
objc.objc_getClass.argtypes = [ctypes.c_char_p]
objc.sel_registerName.restype = ID
objc.sel_registerName.argtypes = [ctypes.c_char_p]
objc.objc_autoreleasePoolPush.restype = ID
objc.objc_autoreleasePoolPop.argtypes = [ID]
msg_id = ctypes.CFUNCTYPE(ID, ID, ID)(("objc_msgSend", objc))
msg_bool = ctypes.CFUNCTYPE(ctypes.c_bool, ID, ID)(("objc_msgSend", objc))
msg_count = ctypes.CFUNCTYPE(ctypes.c_ulong, ID, ID)(("objc_msgSend", objc))
msg_index = ctypes.CFUNCTYPE(ID, ID, ID, ctypes.c_ulong)(("objc_msgSend", objc))
GC_CONTROLLER: Final = objc.objc_getClass(b"GCController")
if GC_CONTROLLER is None:
    raise RuntimeError("gamepad: GameController.framework has no GCController class")
SEL: Final = {
    name: objc.sel_registerName(name.encode())
    for name in ("controllers", "count", "objectAtIndex:", "extendedGamepad", "dpad", "isPressed", *PAD_BUTTONS, *DPAD)
}


def child(obj: int, name: str) -> int | None:
    return msg_id(obj, SEL[name])


def pressed(button: int | None) -> bool:
    return button is not None and msg_bool(button, SEL["isPressed"])


def read_pad(pad: int) -> frozenset[str]:
    down = {name for name in PAD_BUTTONS if pressed(child(pad, name))}
    dpad = child(pad, "dpad")
    if dpad is not None:
        down |= {f"dpad.{d}" for d in DPAD if pressed(child(dpad, d))}
    return frozenset(down)


def read_controllers() -> dict[int, frozenset[str]]:
    pool = objc.objc_autoreleasePoolPush()
    try:
        controllers = child(GC_CONTROLLER, "controllers")
        if controllers is None:
            return {}
        states: dict[int, frozenset[str]] = {}
        for i in range(msg_count(controllers, SEL["count"])):
            controller = msg_index(controllers, SEL["objectAtIndex:"], i)
            pad = None if controller is None else child(controller, "extendedGamepad")
            if controller is not None and pad is not None:
                states[controller] = read_pad(pad)
        return states
    finally:
        objc.objc_autoreleasePoolPop(pool)


def load_bindings() -> dict[str, dict[str, QKeySequence]]:
    config = mw.addonManager.getConfig(__name__)
    if config is None:
        raise RuntimeError("gamepad: config.json missing")
    screens = config.get("bindings")
    if not isinstance(screens, dict):
        raise ValueError("gamepad: 'bindings' must be an object")
    result: dict[str, dict[str, QKeySequence]] = {}
    for screen, bindings in screens.items():
        if screen not in SCREENS:
            raise ValueError(f"gamepad: unknown screen {screen!r}; valid: {', '.join(SCREENS)}")
        if not isinstance(bindings, dict):
            raise ValueError(f"gamepad: bindings for {screen!r} must be an object")
        result[screen] = {}
        for button, key in bindings.items():
            if button not in BUTTONS:
                raise ValueError(f"gamepad: unknown button {button!r}; valid: {', '.join(BUTTONS)}")
            if not isinstance(key, str):
                raise ValueError(f"gamepad: key for {screen}.{button} must be a string")
            sequence = QKeySequence(key)
            if sequence.isEmpty():
                raise ValueError(f"gamepad: invalid key {key!r} for {screen}.{button}")
            result[screen][button] = sequence
    return result


def find_command(sequence: QKeySequence) -> Callable[[], None] | None:
    for shortcut in mw.findChildren(QShortcut):
        if shortcut.isEnabled() and shortcut.key() == sequence:
            return shortcut.activated.emit
    for action in mw.findChildren(QAction):
        if action.isEnabled() and sequence in action.shortcuts():
            return action.trigger
    return None


def current_screen() -> str | None:
    return mw.reviewer.state if mw.state == "review" else mw.state


def start() -> None:
    bindings = load_bindings()
    previous: dict[int, frozenset[str]] = {}

    def poll() -> None:
        states = read_controllers()
        presses = [
            button
            for controller, now in states.items()
            for button in BUTTONS
            if button in now and button not in previous.get(controller, frozenset())
        ]
        previous.clear()
        previous.update(states)
        screen = current_screen()
        if not presses or screen is None or QApplication.activeWindow() is not mw:
            return
        sequence = bindings.get(screen, {}).get(presses[0])
        command = None if sequence is None else find_command(sequence)
        if command is not None:
            command()

    timer = QTimer(mw)
    timer.timeout.connect(poll)
    timer.start(POLL_MS)


gui_hooks.main_window_did_init.append(start)
