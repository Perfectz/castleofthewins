export const PIXEL_ASSET_ROOT = "./assets/vendor/pixel-dungeon-pack/2D Pixel Dungeon Asset Pack";
export const CHARACTER_SHEET_PATH = `${PIXEL_ASSET_ROOT}/character and tileset/Dungeon_Character.png`;
export const TILESET_SHEET_PATH = `${PIXEL_ASSET_ROOT}/character and tileset/Dungeon_Tileset.png`;

function atlasFrame(src, x, y, width = 16, height = 16, sheetWidth = 0, sheetHeight = 0) {
  return {
    src,
    x,
    y,
    width,
    height,
    sheetWidth,
    sheetHeight
  };
}

function gridFrame(src, col, row, tile = 16, sheetWidth = 0, sheetHeight = 0) {
  return atlasFrame(src, col * tile, row * tile, tile, tile, sheetWidth, sheetHeight);
}

export const TOWN_TERRAIN_ASSETS = {
  grass: [
    "./assets/terrain/town/grass-1.png",
    "./assets/terrain/town/grass-2.png",
    "./assets/terrain/town/grass-3.png",
    "./assets/terrain/town/grass-4.png",
    "./assets/terrain/town/grass-5.png"
  ],
  roadHorizontal: [
    "./assets/terrain/town/road-horizontal-1.png",
    "./assets/terrain/town/road-horizontal-2.png",
    "./assets/terrain/town/road-horizontal-3.png"
  ],
  roadVertical: [
    "./assets/terrain/town/road-vertical-1.png",
    "./assets/terrain/town/road-vertical-2.png"
  ],
  roadCross: "./assets/terrain/town/road-cross-1.png"
};

export const TOWN_BUILDING_ASSETS = {
  general: "./assets/buildings/town/general.png",
  junk: "./assets/buildings/town/junk.png",
  armory: "./assets/buildings/town/armory.png",
  guild: "./assets/buildings/town/guild.png",
  temple: "./assets/buildings/town/temple.png",
  bank: "./assets/buildings/town/bank.png",
  sage: "./assets/buildings/town/house.png"
};

export const TILESET_VISUALS = {
  floor: [
    gridFrame(TILESET_SHEET_PATH, 0, 4, 16, 160, 160),
    gridFrame(TILESET_SHEET_PATH, 1, 4, 16, 160, 160),
    gridFrame(TILESET_SHEET_PATH, 2, 4, 16, 160, 160),
    gridFrame(TILESET_SHEET_PATH, 3, 4, 16, 160, 160),
    gridFrame(TILESET_SHEET_PATH, 4, 4, 16, 160, 160),
    gridFrame(TILESET_SHEET_PATH, 0, 5, 16, 160, 160),
    gridFrame(TILESET_SHEET_PATH, 1, 5, 16, 160, 160),
    gridFrame(TILESET_SHEET_PATH, 2, 5, 16, 160, 160),
    gridFrame(TILESET_SHEET_PATH, 3, 5, 16, 160, 160),
    gridFrame(TILESET_SHEET_PATH, 4, 5, 16, 160, 160)
  ],
  wall: [
    gridFrame(TILESET_SHEET_PATH, 1, 0, 16, 160, 160),
    gridFrame(TILESET_SHEET_PATH, 2, 0, 16, 160, 160),
    gridFrame(TILESET_SHEET_PATH, 3, 0, 16, 160, 160),
    gridFrame(TILESET_SHEET_PATH, 4, 0, 16, 160, 160)
  ],
  pillar: [
    gridFrame(TILESET_SHEET_PATH, 5, 0, 16, 160, 160),
    gridFrame(TILESET_SHEET_PATH, 5, 1, 16, 160, 160)
  ],
  stone: [
    gridFrame(TILESET_SHEET_PATH, 0, 4, 16, 160, 160),
    gridFrame(TILESET_SHEET_PATH, 2, 4, 16, 160, 160)
  ],
  trap: [
    gridFrame(TILESET_SHEET_PATH, 3, 9, 16, 160, 160),
    gridFrame(TILESET_SHEET_PATH, 4, 9, 16, 160, 160)
  ],
  altar: [
    gridFrame(TILESET_SHEET_PATH, 5, 9, 16, 160, 160)
  ],
  throne: [
    gridFrame(TILESET_SHEET_PATH, 6, 9, 16, 160, 160)
  ],
  stairDown: [
    gridFrame(TILESET_SHEET_PATH, 9, 3, 16, 160, 160)
  ],
  stairUp: [
    gridFrame(TILESET_SHEET_PATH, 8, 3, 16, 160, 160)
  ],
  chestClosed: [
    gridFrame(TILESET_SHEET_PATH, 4, 7, 16, 160, 160)
  ],
  chestOpen: [
    gridFrame(TILESET_SHEET_PATH, 4, 8, 16, 160, 160)
  ],
  cacheClosed: [
    gridFrame(TILESET_SHEET_PATH, 2, 8, 16, 160, 160)
  ],
  cacheOpen: [
    gridFrame(TILESET_SHEET_PATH, 1, 8, 16, 160, 160)
  ],
  torch: [
    gridFrame(TILESET_SHEET_PATH, 0, 9, 16, 160, 160),
    gridFrame(TILESET_SHEET_PATH, 1, 9, 16, 160, 160)
  ],
  wallTorch: [
    gridFrame(TILESET_SHEET_PATH, 0, 9, 16, 160, 160),
    gridFrame(TILESET_SHEET_PATH, 1, 9, 16, 160, 160)
  ],
  prisonerCell: [
    gridFrame(TILESET_SHEET_PATH, 9, 3, 16, 160, 160)
  ],
  keys: [
    gridFrame(TILESET_SHEET_PATH, 8, 8, 16, 160, 160)
  ],
  coin: [
    gridFrame(TILESET_SHEET_PATH, 6, 8, 16, 160, 160)
  ],
  potionBlue: [
    gridFrame(TILESET_SHEET_PATH, 7, 8, 16, 160, 160)
  ],
  potionRed: [
    gridFrame(TILESET_SHEET_PATH, 9, 8, 16, 160, 160)
  ],
  flask: [
    gridFrame(TILESET_SHEET_PATH, 8, 8, 16, 160, 160)
  ],
  wand: [
    gridFrame(TILESET_SHEET_PATH, 8, 6, 16, 160, 160)
  ],
  sword: [
    gridFrame(TILESET_SHEET_PATH, 5, 6, 16, 160, 160)
  ],
  shield: [
    gridFrame(TILESET_SHEET_PATH, 4, 7, 16, 160, 160)
  ],
  armor: [
    gridFrame(TILESET_SHEET_PATH, 5, 8, 16, 160, 160)
  ],
  spellbook: [
    gridFrame(TILESET_SHEET_PATH, 4, 8, 16, 160, 160)
  ],
  relic: [
    gridFrame(TILESET_SHEET_PATH, 7, 7, 16, 160, 160)
  ],
  flag: [
    gridFrame(TILESET_SHEET_PATH, 7, 7, 16, 160, 160)
  ],
  skull: [
    gridFrame(TILESET_SHEET_PATH, 7, 7, 16, 160, 160)
  ],
  shrine: [
    gridFrame(TILESET_SHEET_PATH, 4, 9, 16, 160, 160)
  ],
  arrowTrap: [
    gridFrame(TILESET_SHEET_PATH, 2, 9, 16, 160, 160)
  ],
  summonTrap: [
    gridFrame(TILESET_SHEET_PATH, 6, 7, 16, 160, 160)
  ]
};

export const BOARD_PROP_VISUALS = {
  townSign: { frames: TILESET_VISUALS.flag, lift: 0.24, light: false },
  roadBeacon: { frames: TILESET_VISUALS.torch, lift: 0.32, light: true },
  roomTorch: { frames: TILESET_VISUALS.wallTorch, lift: 0.34, light: true },
  shrineTorch: { frames: TILESET_VISUALS.wallTorch, lift: 0.34, light: true, tint: "#d7b0ff" },
  rescueBanner: { frames: TILESET_VISUALS.keys, lift: 0.16, light: false, tint: "#ffb997" },
  prisonerCell: { frames: TILESET_VISUALS.prisonerCell, lift: 0.1, light: false },
  broodNest: { frames: TILESET_VISUALS.skull, lift: 0.08, light: false, tint: "#b98a5b" },
  shrineSeal: { frames: TILESET_VISUALS.shrine, lift: 0.12, light: true, tint: "#d3b2ff" },
  relicPedestal: { frames: TILESET_VISUALS.relic, lift: 0.16, light: true, tint: "#b7f0ff" },
  cacheClosed: { frames: TILESET_VISUALS.cacheClosed, lift: 0.12, light: false },
  cacheOpen: { frames: TILESET_VISUALS.cacheOpen, lift: 0.12, light: false },
  vaultChest: { frames: TILESET_VISUALS.chestClosed, lift: 0.14, light: false },
  openedChest: { frames: TILESET_VISUALS.chestOpen, lift: 0.14, light: false },
  bloodAltar: { frames: TILESET_VISUALS.altar, lift: 0.08, light: true, tint: "#ff9576" },
  ghostMerchant: { frames: TILESET_VISUALS.coin, lift: 0.08, light: true, tint: "#d7c6ff" },
  loreBook: { frames: TILESET_VISUALS.spellbook, lift: 0.1, light: false, tint: "#f2d9a1" },
  inscribedStone: { frames: TILESET_VISUALS.shrine, lift: 0.08, light: true, tint: "#d7d4cf" },
  arrowTrap: { frames: TILESET_VISUALS.arrowTrap, lift: 0.08, light: false },
  summonTrap: { frames: TILESET_VISUALS.summonTrap, lift: 0.08, light: true, tint: "#c8a1ff" }
};

export const ACTOR_VISUALS = {
  fighter: { frames: [gridFrame(CHARACTER_SHEET_PATH, 0, 0, 16, 112, 64)], bob: 0.4, tint: "#f4df9d" },
  wizard: { frames: [gridFrame(CHARACTER_SHEET_PATH, 1, 0, 16, 112, 64)], bob: 0.4, tint: "#9bd7ff" },
  rogue: { frames: [gridFrame(CHARACTER_SHEET_PATH, 4, 0, 16, 112, 64)], bob: 0.4, tint: "#d9ab74" },
  human: { frames: [gridFrame(`${PIXEL_ASSET_ROOT}/Character_animation/priests_idle/priest1/v1/priest1_v1_1.png`, 0, 0, 16, 16, 16)], bob: 0.35 },
  elf: { frames: [gridFrame(`${PIXEL_ASSET_ROOT}/Character_animation/priests_idle/priest2/v1/priest2_v1_1.png`, 0, 0, 16, 16, 16)], bob: 0.35 },
  dwarf: { frames: [gridFrame(`${PIXEL_ASSET_ROOT}/Character_animation/priests_idle/priest3/v1/priest3_v1_1.png`, 0, 0, 16, 16, 16)], bob: 0.35 },
  rat: { frames: [gridFrame(CHARACTER_SHEET_PATH, 0, 1, 16, 112, 64)], bob: 0.24 },
  slime: { frames: [gridFrame(CHARACTER_SHEET_PATH, 1, 1, 16, 112, 64)], bob: 0.2 },
  kobold: { frames: [gridFrame(CHARACTER_SHEET_PATH, 2, 1, 16, 112, 64)], bob: 0.32 },
  goblin: { frames: [gridFrame(CHARACTER_SHEET_PATH, 3, 1, 16, 112, 64)], bob: 0.32 },
  orc: { frames: [gridFrame(CHARACTER_SHEET_PATH, 4, 1, 16, 112, 64)], bob: 0.36 },
  skeleton: { frames: [gridFrame(CHARACTER_SHEET_PATH, 5, 1, 16, 112, 64)], bob: 0.28 },
  mage: { frames: [gridFrame(CHARACTER_SHEET_PATH, 6, 1, 16, 112, 64)], bob: 0.32 },
  wolf: { frames: [gridFrame(CHARACTER_SHEET_PATH, 3, 1, 16, 112, 64)], bob: 0.2, tint: "#b5b5bb" },
  troll: { frames: [gridFrame(CHARACTER_SHEET_PATH, 4, 1, 16, 112, 64)], bob: 0.38, tint: "#799759" },
  ogre: { frames: [gridFrame(CHARACTER_SHEET_PATH, 4, 1, 16, 112, 64)], bob: 0.4, tint: "#bf8a5b" },
  wraith: { frames: [gridFrame(CHARACTER_SHEET_PATH, 6, 1, 16, 112, 64)], bob: 0.24, tint: "#ccb7ff" },
  dragon: { frames: [gridFrame(CHARACTER_SHEET_PATH, 4, 1, 16, 112, 64)], bob: 0.42, tint: "#d68c58" }
};

export const ITEM_VISUAL_IDS = {
  gold: "coin",
  quest: "relic",
  healingPotion: "potionRed",
  manaPotion: "potionBlue",
  identifyScroll: "spellbook",
  mappingScroll: "spellbook",
  teleportScroll: "spellbook",
  removeCurseScroll: "spellbook",
  runeScroll: "relic",
  wandLightning: "wand",
  wandSlow: "wand",
  staffHealing: "wand",
  spellbookFrost: "spellbook",
  spellbookFire: "spellbook",
  spellbookPhase: "spellbook",
  spellbookMind: "spellbook",
  spellbookIdentify: "spellbook",
  spellbookSlow: "spellbook",
  spellbookCurse: "spellbook",
  defaultWeapon: "sword",
  defaultArmor: "armor",
  defaultConsumable: "flask",
  defaultCharged: "wand",
  defaultSpellbook: "spellbook",
  defaultRelic: "relic"
};

export function pickVariant(list, x = 0, y = 0) {
  if (!Array.isArray(list) || list.length === 0) {
    return null;
  }
  const hash = ((x * 73856093) ^ (y * 19349663)) >>> 0;
  return list[hash % list.length];
}

export function getTileVisual(kind, x = 0, y = 0) {
  return pickVariant(TILESET_VISUALS[kind], x, y);
}

export function getBoardPropVisual(propId) {
  return BOARD_PROP_VISUALS[propId] || null;
}

export function getActorVisual(visualId) {
  return ACTOR_VISUALS[visualId] || null;
}
