import { test, expect, Page } from "@playwright/test";
import { fixturePlayers } from "../fixtures";

async function provider(page: Page) {
  await page.route("**/api/v1/players?**", async (route) => {
    const u = new URL(route.request().url());
    const role = u.searchParams.get("role");
    const q = u.searchParams.get("q") || "";
    const number = Number(u.searchParams.get("page") || 1);
    const players = fixturePlayers.filter(
      (p) =>
        (!role || role === "ALL" || p.role === role) &&
        p.name.toLowerCase().includes(q.toLowerCase()),
    );
    await route.fulfill({
      json: {
        players: players.slice((number - 1) * 20, number * 20),
        total: players.length,
        page: number,
        pages: Math.max(1, Math.ceil(players.length / 20)),
        stale: false,
        source: "Test provider",
        message: "Automated test fixture",
      },
    });
  });
}
test("mobile navigation preserves catalog position; details, shortlist and comparison work", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await provider(page);
  await page.goto("/players");
  await expect(page.locator(".player-card")).toHaveCount(20);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("Page 2 of 4")).toBeVisible();
  await page
    .getByRole("button", { name: "View Test DEF 05", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Shortlist", exact: true }).click();
  await page.getByRole("button", { name: "Compare", exact: true }).click();
  await page
    .getByRole("button", { name: "View Test DEF 06", exact: true })
    .click();
  await page.getByRole("button", { name: "Compare", exact: true }).click();
  await page
    .getByRole("button", { name: "Compare players", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Player comparison" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.locator(".pagination").scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => scrollY);
  expect(before).toBeGreaterThan(100);
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("link", { name: "Squad", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "The squad." })).toBeVisible();
  await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .getByRole("link", { name: "Players", exact: true })
    .click();
  await expect(page.getByText("Page 2 of 4")).toBeVisible();
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(100);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("full squad, saved reload, simulation and export/import", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await provider(page);
  await page.goto("/players");
  // Visit each page to discover enough of every position without seeding application storage.
  for (let i = 1; i < 4; i++) {
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(page.getByText(`Page ${i + 1} of 4`)).toBeVisible();
  }
  await page.goto("/squad");
  await page
    .getByRole("button", { name: "Autofill from discovered players" })
    .click();
  await expect(page.locator(".summary-strip")).toContainText("11 / 11");
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const request = indexedDB.open("efos-console");
        return await new Promise<number>((resolve) => {
          request.onsuccess = () => {
            const db = request.result;
            const get = db
              .transaction("saves")
              .objectStore("saves")
              .get("active");
            get.onsuccess = () => {
              resolve(get.result.squads[0].members.length);
              db.close();
            };
          };
        });
      }),
    )
    .toBe(11);
  await page.reload();
  await expect(page.locator(".summary-strip")).toContainText("11 / 11");
  await page.goto("/match");
  await page.getByRole("button", { name: "Instant result" }).click();
  await expect(page.getByText("FULL TIME", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Match report" }).click();
  await expect(
    page.getByRole("heading", { name: "The starting eleven." }),
  ).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(11);
  await page.goto("/squad");
  await page.getByRole("button", { name: "My clubs", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export save" }).click();
  const artifact = await download;
  const path = await artifact.path();
  expect(path).toBeTruthy();
  await page.locator("input[type=file]").setInputFiles(path!);
  await expect(page.getByRole("status")).toContainText("Save imported");
  expect(errors).toEqual([]);
});
test("invalid provider response and storage corruption do not create fake players", async ({
  page,
}) => {
  await page.route("**/api/v1/players?**", (route) =>
    route.fulfill({ status: 503, json: { error: "Provider quota exhausted" } }),
  );
  await page.goto("/players");
  await expect(page.getByText("The scouting desk is offline.")).toBeVisible();
  await expect(page.locator(".player-card")).toHaveCount(0);
  await page.goto("/squad");
  await page.getByRole("button", { name: "My clubs", exact: true }).click();
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "broken.json",
      mimeType: "application/json",
      buffer: Buffer.from("{bad"),
    });
  await expect(page.getByRole("status")).toBeVisible();
  await expect(page.getByRole("heading", { name: "My clubs." })).toBeVisible();
});
test("production security, font assets and responsive viewports", async ({
  page,
  request,
}) => {
  const health = await request.get("/api/health");
  expect(health.status()).toBe(200);
  expect(health.headers()["content-security-policy"]).toContain(
    "default-src 'self'",
  );
  expect((await request.get("/server.cjs")).status()).toBe(404);
  expect((await request.get("/assets/absent.js")).status()).toBe(404);
  expect((await request.get("/logo.webp")).status()).toBe(200);
  await provider(page);
  await page.goto("/squad");
  for (const width of [360, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/squad-${width}.png`,
      fullPage: true,
    });
  }
  expect(
    await page.locator("h1").evaluate((el) => getComputedStyle(el).fontFamily),
  ).toContain("Monoton");
  await page.goto("/players");
  await expect(page.locator(".player-card")).toHaveCount(20);
  await page.screenshot({
    path: "test-results/players-desktop.png",
    fullPage: true,
  });
});
test("playback pauses, resumes and completes through the same result", async ({
  page,
}) => {
  await provider(page);
  await page.goto("/players");
  for (let i = 1; i < 4; i++)
    await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.goto("/squad");
  await page
    .getByRole("button", { name: "Autofill from discovered players" })
    .click();
  await page.goto("/match");
  await page.getByRole("button", { name: "Kick off", exact: true }).click();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(page.getByText("PLAYBACK PAUSED")).toBeVisible();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.getByRole("button", { name: "Full time", exact: true }).click();
  await expect(page.getByRole("link", { name: "Match report" })).toBeVisible();
});
