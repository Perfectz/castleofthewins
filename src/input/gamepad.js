import { nowTime } from "../core/utils.js";

export class GamepadInput {
  constructor() {
    this.lastAt = 0;
    this.lastButtons = new Map();
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

  poll(mode) {
    const pad = this.getGamepad();
    if (!pad) {
      return null;
    }
    const now = nowTime();
    const axes = pad.axes || [];
    const buttons = pad.buttons || [];
    const repeatReady = now - this.lastAt > 180;
    const dx = Math.abs(axes[0] || 0) > 0.45 ? Math.sign(axes[0]) : (buttons[15]?.pressed ? 1 : buttons[14]?.pressed ? -1 : 0);
    const dy = Math.abs(axes[1] || 0) > 0.45 ? Math.sign(axes[1]) : (buttons[13]?.pressed ? 1 : buttons[12]?.pressed ? -1 : 0);
    if ((dx || dy) && repeatReady) {
      this.lastAt = now;
      return { type: mode === "target" ? "target" : "move", dx, dy };
    }
    const pressed = (index) => {
      const current = !!buttons[index]?.pressed;
      const last = this.lastButtons.get(index) || false;
      this.lastButtons.set(index, current);
      return current && !last;
    };
    if (pressed(0)) { return { type: "confirm" }; }
    if (pressed(1)) { return { type: "cancel" }; }
    if (pressed(2)) { return { type: "action", action: "interact" }; }
    if (pressed(3)) { return { type: "action", action: "wait" }; }
    if (pressed(4)) { return { type: "action", action: "inventory" }; }
    if (pressed(5)) { return { type: "action", action: "spells" }; }
    if (pressed(8)) { return { type: "action", action: "map-focus" }; }
    if (pressed(9)) { return { type: "action", action: "settings" }; }
    return null;
  }
}
