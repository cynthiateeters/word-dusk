export const STORAGE_KEY = "wordDusk.save.v1";
export const SAVE_VERSION = 1;

function defaultSave() {
  return {
    version: SAVE_VERSION,
    currentLevel: 0,
    clearedLevels: [],
    bonusFoundByLevel: {},
    hintCredits: 3,
  };
}

function isValidSave(data) {
  return (
    data &&
    typeof data === "object" &&
    data.version === SAVE_VERSION &&
    typeof data.currentLevel === "number" &&
    Array.isArray(data.clearedLevels) &&
    typeof data.bonusFoundByLevel === "object" &&
    data.bonusFoundByLevel !== null &&
    typeof data.hintCredits === "number"
  );
}

export function loadSave(storage) {
  if (!storage) return defaultSave();
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return defaultSave();
    const parsed = JSON.parse(raw);
    if (!isValidSave(parsed)) return defaultSave();
    return parsed;
  } catch {
    return defaultSave();
  }
}

export function writeSave(save, storage) {
  if (!storage) return;
  storage.setItem(STORAGE_KEY, JSON.stringify({ ...save, version: SAVE_VERSION }));
}

export function totalBonusCount(save) {
  return Object.values(save.bonusFoundByLevel).reduce((sum, words) => sum + words.length, 0);
}
