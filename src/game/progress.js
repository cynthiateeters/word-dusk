export function isLevelCleared(level, clearedLevels) {
  return clearedLevels.includes(level.id);
}

export function isLevelUnlocked(levelIndex, levels, clearedLevels) {
  if (levelIndex === 0) return true;
  return clearedLevels.includes(levels[levelIndex - 1].id);
}
