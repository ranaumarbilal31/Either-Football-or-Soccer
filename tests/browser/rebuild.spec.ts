import { test, expect, Page } from "@playwright/test";
import { fixtureCatalog } from "../rebuild-fixtures";
async function mock(page: Page) {
  await page.route("**/api/v3/catalog", (r) =>
    r.fulfill({ json: fixtureCatalog() }),
  );
  await page.route("**/api/v3/refresh", (r) =>
    r.fulfill({
      json: {
        id: "test",
        state: "idle",
        progress: 0,
        total: 25,
        message: "Ready",
        errors: [],
        updatedAt: null,
      },
    }),
  );
}
async function start(page: Page, auto = false) {
  await mock(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Get started", exact: true }).click();
  await page
    .getByRole("button", {
      name: auto ? "Auto-select club & squad" : "Skip for now",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "Build your eleven." }),
  ).toBeVisible();
}
test("home has one primary action and no sidebar; skip creates an empty club", async ({
  page,
}) => {
  await mock(page);
  await page.goto("/");
  await expect(page.getByRole("button")).toHaveCount(1);
  await expect(page.locator("aside")).toHaveCount(0);
  await page.getByRole("button", { name: "Get started" }).click();
  await expect(page.getByLabel("Team name")).toHaveValue("");
  await expect(page.getByLabel("Points budget")).toHaveValue("100");
  await page.getByRole("button", { name: "Skip for now" }).click();
  await expect(page.getByText("/ 11 selected")).toContainText("0");
  await expect(
    page.getByRole("button", { name: "Choose your match" }),
  ).toBeDisabled();
  await expect(page.getByText("60 players · ranked by ability")).toBeVisible();
});
test("setup budget difficulty, auto squad, persistence and both-team match report", async ({
  page,
}) => {
  await mock(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Get started" }).click();
  await page.getByLabel("Team name").fill("Rana United");
  await page.getByLabel("Manager name").fill("Rana");
  await page.getByRole("button", { name: "Very Hard 70 pts" }).click();
  await expect(page.getByLabel("Points budget")).toHaveValue("70");
  await page.getByRole("button", { name: "Auto-select club & squad" }).click();
  await expect(page.getByText("/ 11 selected")).toContainText("11");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Rana United", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Choose your match" }).click();
  await page.getByRole("button", { name: /Single match/ }).click();
  await expect(page.getByLabel("Choose competition")).toHaveValue("");
  await page.getByLabel("Choose competition").selectOption("PL");
  await expect(page.getByLabel("Choose opponent")).toHaveValue("");
  await page.getByLabel("Choose opponent").selectOption("team-0");
  await page.getByRole("button", { name: "Play match", exact: true }).click();
  await expect(page.getByLabel("Live match pitch")).toBeVisible();
  await page
    .getByRole("button", { name: "Play to full time", exact: true })
    .click();
  await page
    .getByRole("button", { name: "View match report", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Match report." }),
  ).toBeVisible();
  await expect(page.locator(".performance-list>div")).toHaveCount(22);
  await expect(
    page.getByText("Player of the match:", { exact: false }),
  ).toBeVisible();
});
test("search button and Enter search the full catalog and support click assignment", async ({
  page,
}) => {
  await start(page);
  await page.getByLabel("Search players").fill("Player club-0-0");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.locator(".player-card")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Add Player club-0-0", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "GK slot 1: Player club-0-0" }),
  ).toBeVisible();
  await page.getByLabel("Search players").fill("Player club-1-0");
  await page.getByLabel("Search players").press("Enter");
  await expect(page.locator(".player-card")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Player club-1-0", exact: false })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "No verified individual match history",
  );
  await page.getByRole("button", { name: "Done", exact: true }).click();
});
test("drag and drop rejects an outfield player in goal", async ({ page }) => {
  await start(page);
  await page.getByLabel("Search players").fill("Player club-0-10");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page
    .locator(".player-card")
    .dragTo(page.getByRole("button", { name: "GK slot 1: empty" }));
  await expect(
    page.getByRole("status").filter({ hasText: "Goalkeepers can only" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "GK slot 1: empty" }),
  ).toBeVisible();
  await page
    .locator(".player-card")
    .dragTo(page.getByRole("button", { name: "FWD slot 11: empty" }));
  await expect(
    page.getByRole("button", { name: "FWD slot 11: Player club-0-10" }),
  ).toBeVisible();
});
test("league adds your club, runs rounds, locks prices and produces rankings", async ({
  page,
}) => {
  await start(page, true);
  await page.getByRole("button", { name: "Choose your match" }).click();
  await page.getByRole("button", { name: /League season/ }).click();
  await page.getByLabel("Choose competition").selectOption("PL");
  await page.getByRole("button", { name: "Enter league" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(4);
  for (let i = 0; i < 6; i++) {
    await page.getByRole("button", { name: "Play next round" }).click();
    if (await page.getByLabel("Live match pitch").count()) {
      await page
        .getByRole("button", { name: "Play to full time", exact: true })
        .click();
      await page
        .getByRole("button", { name: "View match report", exact: true })
        .click();
      await page.getByRole("link", { name: "Play", exact: true }).click();
    }
  }
  await expect(
    page.getByRole("button", { name: "Season finished" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("heading", { name: "Season player rankings" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Squad builder" }).click();
  await expect(page.getByText("Season prices locked")).toBeVisible();
});
test("mobile has switchable pitch and player panels without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await start(page);
  await expect(page.locator(".pitch")).toBeVisible();
  await expect(page.locator(".scout-panel")).toBeHidden();
  await page.getByRole("button", { name: "Players", exact: true }).click();
  await expect(page.locator(".scout-panel")).toBeVisible();
  await expect(page.locator(".pitch-panel")).toBeHidden();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("old saves are archived without being selected by the new game", async ({
  page,
}) => {
  await mock(page);
  await page.goto("/");
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("efos-console", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("saves");
      request.onsuccess = () => {
        const db = request.result,
          tx = db.transaction("saves", "readwrite");
        tx.objectStore("saves").put(
          { name: "Old selected club", players: ["old-player"] },
          "active",
        );
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
      };
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve) => {
      const r = indexedDB.deleteDatabase("efos-rebuilt");
      r.onsuccess = () => resolve();
    });
  });
  await page.reload();
  await page.getByRole("button", { name: "Get started" }).click();
  await expect(page.getByLabel("Team name")).toHaveValue("");
  await page.getByRole("button", { name: "Skip for now" }).click();
  await page.getByRole("link", { name: "Club settings" }).click();
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export previous version’s save" })
    .click();
  expect((await download).suggestedFilename()).toBe("efos-previous-save.json");
});
test("catalog failure has a retry and refresh action", async ({ page }) => {
  await page.route("**/api/v3/catalog", (r) =>
    r.fulfill({ status: 503, json: { error: "Provider unavailable" } }),
  );
  await page.goto("/setup");
  await page.getByRole("button", { name: "Skip for now" }).click();
  await expect(
    page.getByRole("heading", { name: "Player data is unavailable" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Retry", exact: true }),
  ).toBeVisible();
});
test("refresh keeps selected players but blocks play when new prices exceed budget", async ({
  page,
}) => {
  await start(page, true);
  await page.getByRole("link", { name: "Club settings" }).click();
  await page.getByLabel("Points budget").fill("70");
  await page.getByRole("button", { name: /Save club settings/ }).click();
  await page.getByRole("link", { name: "Club settings" }).click();
  let refreshed = false;
  await page.route("**/api/v3/catalog", (r) => {
    const c = fixtureCatalog();
    if (refreshed) {
      c.revision = "updated";
      c.players = c.players.map((p) => ({ ...p, price: 9 }));
    }
    return r.fulfill({ json: c });
  });
  await page.route("**/api/v3/refresh", (r) => {
    const post = r.request().method() === "POST";
    if (post) refreshed = true;
    return r.fulfill({
      json: {
        id: "refresh-test",
        state: post ? "running" : refreshed ? "complete" : "idle",
        progress: post ? 0 : 25,
        total: 25,
        message: "Updated",
        errors: [],
        updatedAt: null,
      },
    });
  });
  await page
    .getByRole("button", { name: "Update player database", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Updated" }),
  ).toBeVisible({ timeout: 12000 });
  await page.getByRole("link", { name: "Squad builder" }).click();
  await expect(
    page.getByText("Your squad is over budget.", { exact: false }),
  ).toBeVisible({ timeout: 12000 });
  await expect(page.getByText("/ 11 selected")).toContainText("11");
  await expect(
    page.getByRole("button", { name: "Choose your match" }),
  ).toBeDisabled();
});
test("desktop keeps the whole pitch beside the player list", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await start(page);
  const pitch = await page.locator(".pitch").boundingBox(),
    players = await page.locator(".scout-panel").boundingBox();
  expect(pitch!.y + pitch!.height).toBeLessThan(900);
  expect(players!.x).toBeGreaterThan(pitch!.x + pitch!.width);
  await page.screenshot({ path: "test-results/rebuilt-desktop.png" });
});

test("native frontend keeps requested branding and removes slogans and footer", async ({
  page,
}) => {
  await start(page);
  await expect(page.locator("h1")).toHaveCSS("font-family", /Monoton/);
  await expect(page.locator("footer")).toHaveCount(0);
  await expect(page.getByText("YOUR CLUB. YOUR CALL.")).toHaveCount(0);
  await page.getByRole("link", { name: /Either Football/ }).click();
  await expect(page.getByRole("link", { name: "GitHub" })).toHaveAttribute(
    "href",
    "https://github.com/ranaumarbilal31/Either-Football-or-Soccer",
  );
  await expect(page.getByText("THE BEAUTIFUL GAME. YOUR WAY.")).toHaveCount(0);
  await expect(page.locator("h1 em")).toHaveCSS("font-family", /Monoton/);
});

test("live search signs only verified database players and reports quota failure", async ({
  page,
}) => {
  await start(page);
  await page.route("**/api/v3/players/live?q=*", (r) =>
    r.fulfill({
      json: {
        results: [
          { name: "Verified Player", playerId: "club-0-0", verified: true },
          {
            name: "Unverified Player",
            club: "Unknown Club",
            playerId: null,
            verified: false,
          },
        ],
      },
    }),
  );
  await page.getByRole("button", { name: "Live search", exact: true }).click();
  await page.getByLabel("Search players").fill("Player");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByText("Profile only")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Add Player club-0-0", exact: true }),
  ).toBeVisible();
  await page.route("**/api/v3/players/live?q=*", (r) =>
    r.fulfill({ status: 503, json: { error: "Live provider quota reached." } }),
  );
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Retry live search" }),
  ).toBeVisible();
});

test("interactive match clock pauses and tactical changes keep the manager in control", async ({
  page,
}) => {
  await page.clock.install();
  await start(page, true);
  await page.getByRole("button", { name: "Choose your match" }).click();
  await page.getByRole("button", { name: /Single match/ }).click();
  await page.getByLabel("Choose competition").selectOption("PL");
  await page.getByLabel("Choose opponent").selectOption("team-0");
  await page.getByRole("button", { name: "Play match", exact: true }).click();
  await expect(page.locator("#match-clock")).toHaveText("0′");
  await page.getByRole("button", { name: "Chase goal" }).click();
  await expect(page.getByLabel("Match tempo", { exact: true })).toHaveValue(
    "80",
  );
  await page
    .getByRole("button", { name: "Kick off / Resume", exact: true })
    .click();
  await page.clock.runFor(1600);
  await expect(page.locator("#match-clock")).toHaveText("2′");
  await page.getByRole("button", { name: "Pause match" }).click();
  await page.clock.runFor(2400);
  await expect(page.locator("#match-clock")).toHaveText("2′");
  await page
    .getByRole("button", { name: "Play to full time", exact: true })
    .click();
  await expect(page.locator("#match-clock")).toHaveText("90′");
});

test("actual CSV database appears in available players and searches Haaland", async ({
  page,
}) => {
  await page.goto("/");
  const response = await page.request.get("/api/v3/catalog");
  const c = await response.json();
  expect(c.availableIds.length).toBeGreaterThan(2000);
  await page.getByRole("button", { name: "Get started", exact: true }).click();
  await page.getByRole("button", { name: "Skip for now", exact: true }).click();
  await page.getByLabel("Search players").fill("Haaland");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Add Erling Haaland", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Erling Haaland", exact: false })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toContainText("CSV · 2026/27");
  await page.screenshot({ path: "test-results/csv-player-details.png" });
});
