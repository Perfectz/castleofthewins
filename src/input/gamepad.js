import { nowTime } from "../core/utils.js";

export class GamepadInput {
  constructor() {
    this.lastMoveAt = 0;
    this.lastMoveDirection = "";
    this.lastScrollAt = 0;
    this.lastButtons = new Map();
  }

  resetMoveState() {
    this.lastMoveAt = 0;
    this.lastMoveDirection = "";
  }

  isConnected() {
    return this.getGamepad() !== null;
  }

  getControllerName() {
    const pad = this.getGamepad();
    return pad ? pad.id : "Controller";
  }

  getGamepad() {
    if (typeof navigator === "undefined" || !navigator.getGamepads) {
      return null;
    }
    const pads = navigator.getGamepads();
    for (const pad of pads) {
      if (pad && pad.connected) {
        return pad;
      }
    }
    return null;
  }

  poll(mode, moveRepeatMs = 180) {
    const pad = this.getGamepad();
    if (!pad) {
      this.resetMoveState();
      return null;
    }
    const now = nowTime();
    const axes = pad.axes || [];
    const buttons = pad.buttons || [];
    const scrollRepeatReady = now - this.lastScrollAt > 140;
    const dx = Math.abs(axes[0] || 0) > 0.45 ? Math.sign(axes[0]) : (buttons[15]?.pressed ? 1 : buttons[14]?.pressed ? -1 : 0);
    const dy = Math.abs(axes[1] || 0) > 0.45 ? Math.sign(axes[1]) : (buttons[13]?.pressed ? 1 : buttons[12]?.pressed ? -1 : 0);
    const moveDirection = (dx || dy) ? `${dx},${dy}` : "";
    const moveRepeatReady = Boolean(moveDirection)
      && (moveDirection !== this.lastMoveDirection || now - this.lastMoveAt >= moveRepeatMs);
    const scrollAxis = Math.abs(axes[3] || 0) > 0.45
      ? Math.sign(axes[3])
      : buttons[7]?.pressed
        ? 1
        : buttons[6]?.pressed
          ? -1
          : 0;
    if ((dx || dy) && moveRepeatReady) {
      this.lastMoveAt = now;
      this.lastMoveDirection = moveDirection;
      if (mode === "target") {
        return { type: "target", dx, dy };
      }
      if (mode === "modal" || mode === "creation" || mode === "title" || mode === "levelup") {
        return { type: "ui-move", dx, dy };
      }
      return { type: "move", dx, dy };
    }
    if (!moveDirection) {
      this.lastMoveDirection = "";
    }
    const pressed = (index) => {
      const current = !!buttons[index]?.pressed;
      const last = this.lastButtons.get(index) || false;
      this.lastButtons.set(index, current);
      return current && !last;
    };
    if (mode !== "target" && (mode === "modal" || mode === "creation" || mode === "title" || mode === "levelup")) {
      if (pressed(4)) {
        return { type: "ui-tab-prev" };
      }
      if (pressed(5)) {
        return { type: "ui-tab-next" };
      }
      if (scrollAxis && scrollRepeatReady) {
        this.lastScrollAt = now;
        return { type: "ui-scroll", delta: scrollAxis };
      }
    }
    if (mode === "game" || mode === "target") {
      if (pressed(0)) { return { type: "dock", slot: "primary" }; }
      if (pressed(1)) { return { type: "dock", slot: "back" }; }
      if (pressed(2)) { return { type: "dock", slot: "secondary" }; }
      if (pressed(3)) { return { type: "dock", slot: "pack" }; }
    }
    if (pressed(0)) { return { type: "ui-confirm" }; }
    if (pressed(1)) { return { type: "ui-back" }; }
    if (pressed(4)) { return { type: "action", action: "open-hub", tab: "magic" }; }
    if (pressed(5)) { return { type: "action", action: "open-utility-menu" }; }
    if (pressed(8)) { return { type: "action", action: "map-focus" }; }
    if (pressed(9)) { return { type: "action", action: "open-utility-menu" }; }
    return null;
  }
}
