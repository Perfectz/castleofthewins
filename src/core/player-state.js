/**
 * @module player-state
 * @owns Centralized mutation interface for player state
 *
 * Provides explicit, validated mutation methods instead of direct
 * property access. Feature modules should prefer these methods
 * over raw game.player.* mutations.
 *
 * Usage: game.ps = createPlayerState(() => game.player);
 * Then: game.ps.adjustHp(-5) instead of game.player.hp -= 5;
 *
 * @mutates game.player.hp, game.player.mana, game.player.gold,
 *          game.player.inventory, game.player.equipment,
 *          game.player status effect counters
 */

/**
 * Creates a player state wrapper with validated mutation methods.
 * @param {function} getPlayer - Accessor returning the current player object
 * @returns {object} Player state interface
 */
export function createPlayerState(getPlayer) {
  return {
    // --- HP ---
    /** @mutates player.hp */
    adjustHp(delta) {
      const p = getPlayer();
      if (!p) return;
      p.hp = Math.max(0, Math.min(p.maxHp || p.hp, p.hp + delta));
    },
    setHp(value) {
      const p = getPlayer();
      if (!p) return;
      p.hp = Math.max(0, Math.min(p.maxHp || value, value));
    },
    getHp() {
      const p = getPlayer();
      return p ? p.hp : 0;
    },

    // --- Mana ---
    /** @mutates player.mana */
    adjustMana(delta) {
      const p = getPlayer();
      if (!p) return;
      p.mana = Math.max(0, Math.min(p.maxMana || p.mana, p.mana + delta));
    },
    getMana() {
      const p = getPlayer();
      return p ? p.mana : 0;
    },

    // --- Gold ---
    /** @mutates player.gold */
    adjustGold(delta) {
      const p = getPlayer();
      if (!p) return;
      p.gold = Math.max(0, (p.gold || 0) + delta);
    },
    getGold() {
      const p = getPlayer();
      return p ? (p.gold || 0) : 0;
    },

    // --- Status effects ---
    /** @mutates player[key] */
    setStatus(key, turns) {
      const p = getPlayer();
      if (!p) return;
      p[key] = Math.max(0, turns);
    },
    getStatus(key) {
      const p = getPlayer();
      return p ? (p[key] || 0) : 0;
    },

    // --- Constitution loss (overcast penalty) ---
    /** @mutates player.constitutionLoss */
    adjustConstitutionLoss(delta) {
      const p = getPlayer();
      if (!p) return;
      const maxLoss = Math.max(0, (p.stats?.con || 10) - 1);
      p.constitutionLoss = Math.min(maxLoss, Math.max(0, (p.constitutionLoss || 0) + delta));
    },

    // --- Inventory ---
    /** @mutates player.inventory */
    addItem(item) {
      const p = getPlayer();
      if (!p || !item) return false;
      if (!Array.isArray(p.inventory)) p.inventory = [];
      p.inventory.push(item);
      return true;
    },
    /** @mutates player.inventory */
    removeItemAt(index) {
      const p = getPlayer();
      if (!p || !Array.isArray(p.inventory)) return null;
      if (index < 0 || index >= p.inventory.length) return null;
      return p.inventory.splice(index, 1)[0];
    },

    // --- Perks & Relics ---
    /** @mutates player.perks */
    addPerk(perkId) {
      const p = getPlayer();
      if (!p) return;
      if (!Array.isArray(p.perks)) p.perks = [];
      if (!p.perks.includes(perkId)) p.perks.push(perkId);
    },
    hasPerk(perkId) {
      const p = getPlayer();
      return p?.perks?.includes(perkId) || false;
    },
    /** @mutates player.relics */
    addRelic(relicId) {
      const p = getPlayer();
      if (!p) return;
      if (!Array.isArray(p.relics)) p.relics = [];
      p.relics.push(relicId);
    },

    // --- Spells ---
    /** @mutates player.spellsKnown */
    learnSpell(spellId) {
      const p = getPlayer();
      if (!p) return false;
      if (!Array.isArray(p.spellsKnown)) p.spellsKnown = [];
      if (p.spellsKnown.includes(spellId)) return false;
      p.spellsKnown.push(spellId);
      return true;
    },
    knowsSpell(spellId) {
      const p = getPlayer();
      return p?.spellsKnown?.includes(spellId) || false;
    },

    // --- Run currencies ---
    /** @mutates player.runCurrencies[key] */
    adjustCurrency(key, delta) {
      const p = getPlayer();
      if (!p) return;
      if (!p.runCurrencies) p.runCurrencies = {};
      p.runCurrencies[key] = Math.max(0, (p.runCurrencies[key] || 0) + delta);
    },
    getCurrency(key) {
      const p = getPlayer();
      return p?.runCurrencies?.[key] || 0;
    },

    // --- Queries (read-only, safe to call anytime) ---
    isAlive() {
      const p = getPlayer();
      return p && p.hp > 0;
    },
    getLevel() {
      const p = getPlayer();
      return p ? (p.level || 1) : 1;
    },
    getName() {
      const p = getPlayer();
      return p ? (p.name || "Unknown") : "Unknown";
    }
  };
}
