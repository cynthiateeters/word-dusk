import { test, expect } from "@playwright/test";

// Level 1 (seed 1): letters S, P, U, N (wheel positions 0-3 in that order).
// Grid words: SPUN, PUN, SUN, PUS, PUNS, UPS. Bonus words: NUS, SUP, UNS.

test("traces a word by dragging through the wheel", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("level-tile-0").click();

  const positions = [];
  for (let i = 0; i < 4; i++) {
    const box = await page.getByTestId(`wheel-letter-${i}`).boundingBox();
    positions.push({ x: box.x + box.width / 2, y: box.y + box.height / 2 });
  }

  await page.mouse.move(positions[0].x, positions[0].y);
  await page.mouse.down();
  for (let i = 1; i < positions.length; i++) {
    await page.mouse.move(positions[i].x, positions[i].y, { steps: 10 });
  }
  await page.mouse.up();

  await expect(page.locator(".cell.revealed")).not.toHaveCount(0);
  const revealedLetters = await page.locator(".cell.revealed").allTextContents();
  expect(revealedLetters.sort()).toEqual(["N", "P", "S", "U"]);
});

test("shuffle keeps the same letters and hint spends a credit", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("level-tile-0").click();

  const before = await Promise.all(
    [0, 1, 2, 3].map((i) => page.getByTestId(`wheel-letter-${i}`).textContent()),
  );
  await page.getByTestId("shuffle-button").click();
  const after = await Promise.all(
    [0, 1, 2, 3].map((i) => page.getByTestId(`wheel-letter-${i}`).textContent()),
  );
  expect([...after].sort()).toEqual([...before].sort());

  await expect(page.getByTestId("hint-button")).toHaveText("Hint (3)");
  await page.getByTestId("hint-button").click();
  await expect(page.getByTestId("hint-button")).toHaveText("Hint (2)");
  await expect(page.locator(".cell.revealed")).toHaveCount(1);
});

test("finds a bonus word via keyboard", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("level-tile-0").click();

  await page.getByTestId("wheel").click();
  await page.keyboard.type("sup");
  await page.keyboard.press("Enter");

  await expect(page.getByTestId("bonus-chip")).toContainText("1 bonus");
});

test("completes a level via keyboard, advances, and progress survives reload", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("level-tile-0").click();

  await page.getByTestId("wheel").click();
  for (const word of ["sup", "spun", "pun", "sun", "pus", "puns", "ups"]) {
    await page.keyboard.type(word);
    await page.keyboard.press("Enter");
  }

  await expect(page.getByTestId("level-complete-overlay")).toBeVisible();
  await page.getByTestId("overlay-advance").click();

  await expect(page.getByTestId("level-tile-0")).toHaveClass(/cleared/);
  await expect(page.getByTestId("level-tile-1")).toBeEnabled();

  await page.reload();
  await expect(page.getByTestId("level-tile-0")).toHaveClass(/cleared/);
  await expect(page.getByTestId("level-tile-1")).toBeEnabled();
});
