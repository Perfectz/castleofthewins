/**
 * @module effect-bus
 * @owns Side-effect collection and application for game rules
 *
 * Feature modules produce effects (logs, sounds, readouts, vfx).
 * Only game.js consumes them via applyEffects().
 * This separates game rules from presentation concerns.
 *
 * Superset of command-result.js — adds readouts and visual effects.
 */

export function createEffects() {
  return {
    logs: [],
    sounds: [],
    readouts: [],
    vfx: [],
    render: false,
    autosave: false,
    refreshChrome: false
  };
}

export function addLog(fx, message, tone = "") {
  fx.logs.push({ message, tone });
  return fx;
}

export function addSound(fx, sound) {
  if (sound) {
    fx.sounds.push(sound);
  }
  return fx;
}

export function addReadout(fx, text, x, y, color, duration = 0) {
  fx.readouts.push({ text, x, y, color, duration });
  return fx;
}

export function addVfx(fx, effect) {
  if (effect) {
    fx.vfx.push(effect);
  }
  return fx;
}

export function requestRender(fx) {
  fx.render = true;
  return fx;
}

export function requestAutosave(fx) {
  fx.autosave = true;
  return fx;
}

export function requestRefreshChrome(fx) {
  fx.refreshChrome = true;
  return fx;
}

export function mergeEffects(target, source) {
  if (!source) return target;
  target.logs.push(...source.logs);
  target.sounds.push(...source.sounds);
  target.readouts.push(...source.readouts);
  target.vfx.push(...source.vfx);
  target.render = target.render || source.render;
  target.autosave = target.autosave || source.autosave;
  target.refreshChrome = target.refreshChrome || source.refreshChrome;
  return target;
}

/**
 * Terminal function — only game.js should call this.
 * Applies all accumulated effects to the running game instance.
 * @param {object} game - The Game instance
 * @param {object} fx - Effects object from createEffects()
 */
export function applyEffects(game, fx) {
  if (!fx) return;
  for (const entry of fx.logs) {
    game.log(entry.message, entry.tone);
  }
  for (const sound of fx.sounds) {
    game.audio.play(sound);
  }
  for (const r of fx.readouts) {
    game.emitReadout(r.text, r.x, r.y, r.color, r.duration);
  }
  for (const v of fx.vfx) {
    if (typeof game.addEffect === "function") {
      game.addEffect(v);
    }
  }
  if (fx.autosave) {
    game.saveGame({ silent: true });
  }
  if (fx.refreshChrome) {
    game.refreshChrome();
  }
  if (fx.render) {
    game.render();
  }
}
