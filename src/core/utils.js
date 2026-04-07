export function choice(list) {
  return list[Math.floor(Math.random() * list.length)];
}

export function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function roll(count, sides) {
  let total = 0;
  for (let i = 0; i < count; i += 1) {
    total += randInt(1, sides);
  }
  return total;
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function nowTime() {
  return typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
}

export function distance(a, b) {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

export function structuredCloneCompat(value) {
  return JSON.parse(JSON.stringify(value));
}

export function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function valueTone(ratio, invert = false) {
  if (invert ? ratio <= 0.3 : ratio >= 0.7) {
    return "value-bad";
  }
  if (invert ? ratio <= 0.6 : ratio >= 0.4) {
    return "value-warning";
  }
  return "value-good";
}

export function removeFromArray(array, entry) {
  const index = array.indexOf(entry);
  if (index >= 0) {
    array.splice(index, 1);
  }
}

export function removeAt(array, index) {
  array.splice(index, 1);
}

export function shadeColor(hex, amount) {
  const value = hex.replace("#", "");
  const parsed = parseInt(value, 16);
  const r = clamp(((parsed >> 16) & 255) + amount, 0, 255);
  const g = clamp(((parsed >> 8) & 255) + amount, 0, 255);
  const b = clamp((parsed & 255) + amount, 0, 255);
  return `rgb(${r}, ${g}, ${b})`;
}

export function choiceCard(entry, type, selected, options = {}) {
  const artHtml = options.artHtml || "";
  const metaHtml = options.metaHtml || "";
  const noteText = options.noteText || entry.summary || "";
  const className = options.className || "";
  const button = document.createElement("button");
  button.type = "button";
  button.className = `choice-card${className ? ` ${className}` : ""}${selected ? " selected" : ""}`;
  button.dataset[type] = entry.id;
  button.innerHTML = `
    ${artHtml ? `<div class="choice-card-art">${artHtml}</div>` : ""}
    <div class="choice-card-body">
      <div class="choice-title">${escapeHtml(entry.name)}</div>
      ${noteText ? `<div class="choice-note">${escapeHtml(noteText)}</div>` : ""}
      ${metaHtml ? `<div class="choice-card-meta">${metaHtml}</div>` : ""}
    </div>
  `;
  return button;
}

export function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = randInt(0, i);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function removeOne(list, value) {
  const index = list.indexOf(value);
  if (index >= 0) {
    list.splice(index, 1);
  }
}
