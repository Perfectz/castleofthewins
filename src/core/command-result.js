export function createCommandResult() {
  return {
    logs: [],
    sounds: [],
    autosave: false,
    refreshChrome: false,
    render: false
  };
}

export function addCommandLog(result, message, tone = "") {
  result.logs.push({ message, tone });
  return result;
}

export function addCommandSound(result, sound) {
  if (sound) {
    result.sounds.push(sound);
  }
  return result;
}

export function applyCommandResult(game, result) {
  if (!result) {
    return;
  }
  result.logs.forEach((entry) => game.log(entry.message, entry.tone));
  result.sounds.forEach((sound) => game.audio.play(sound));
  if (result.autosave) {
    game.saveGame({ silent: true });
  }
  if (result.refreshChrome) {
    game.refreshChrome();
  }
  if (result.render) {
    game.render();
  }
}
