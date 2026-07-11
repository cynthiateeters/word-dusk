export const CURRENT_SCHEMA_VERSION = 1;

const DIRS = new Set(["across", "down"]);

function err(errors, msg) {
  errors.push(msg);
}

function validateLevel(level, index, errors) {
  const prefix = `level[${index}]`;
  if (typeof level.id !== "number" && typeof level.id !== "string") {
    err(errors, `${prefix}: missing id`);
  }
  if (typeof level.name !== "string" || level.name.length === 0) {
    err(errors, `${prefix}: missing name`);
  }
  if (!Array.isArray(level.letters) || level.letters.length === 0) {
    err(errors, `${prefix}: letters must be a non-empty array`);
    return;
  }
  if (!level.letters.every((l) => typeof l === "string" && /^[A-Z]$/.test(l))) {
    err(errors, `${prefix}: letters must be single uppercase characters`);
  }

  if (!Array.isArray(level.grid) || level.grid.length === 0) {
    err(errors, `${prefix}: grid must be a non-empty array`);
    return;
  }

  const letterMultiset = new Map();
  level.letters.forEach((l) => letterMultiset.set(l, (letterMultiset.get(l) || 0) + 1));

  level.grid.forEach((w, wi) => {
    const wprefix = `${prefix}.grid[${wi}]`;
    if (typeof w.word !== "string" || !/^[A-Z]+$/.test(w.word)) {
      err(errors, `${wprefix}: word must be uppercase alpha`);
      return;
    }
    if (typeof w.row !== "number" || typeof w.col !== "number") {
      err(errors, `${wprefix}: row/col must be numbers`);
    }
    if (!DIRS.has(w.dir)) {
      err(errors, `${wprefix}: dir must be "across" or "down"`);
    }
    const counts = new Map();
    for (const ch of w.word) counts.set(ch, (counts.get(ch) || 0) + 1);
    for (const [ch, count] of counts) {
      if ((letterMultiset.get(ch) || 0) < count) {
        err(errors, `${wprefix}: word "${w.word}" not formable from level letters`);
        break;
      }
    }
  });

  if (!Array.isArray(level.bonus)) {
    err(errors, `${prefix}: bonus must be an array`);
  } else if (!level.bonus.every((b) => typeof b === "string" && /^[A-Z]+$/.test(b))) {
    err(errors, `${prefix}: bonus entries must be uppercase alpha strings`);
  }
}

export function validateLevels(json) {
  const errors = [];

  if (!json || typeof json !== "object") {
    return { valid: false, errors: ["root: expected an object"] };
  }
  if (json.schemaVersion !== CURRENT_SCHEMA_VERSION) {
    err(errors, `root: schemaVersion must be ${CURRENT_SCHEMA_VERSION}, got ${json.schemaVersion}`);
  }
  if (!json.generator || typeof json.generator !== "object") {
    err(errors, "root: missing generator metadata");
  }
  if (!Array.isArray(json.levels) || json.levels.length === 0) {
    err(errors, "root: levels must be a non-empty array");
    return { valid: errors.length === 0, errors };
  }

  json.levels.forEach((level, i) => validateLevel(level, i, errors));

  return { valid: errors.length === 0, errors };
}
