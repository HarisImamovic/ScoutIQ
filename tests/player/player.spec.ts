import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import { LoginPage } from "../pages/LoginPage";
import { env } from "../utils/env";

test.describe("Player", () => {
  test.describe.configure({ mode: "serial" });

  let page: Page;
  let context: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    const lp = new LoginPage(page);
    await lp.loginAndWait(env.playerEmail, env.playerPassword);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test("17. Highlights page loads", async () => {
    await page.goto("/dashboard/highlights");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: "Highlights", exact: true })).toBeVisible();
  });

  test("18. Add a highlight", async () => {
    const btn = page
      .getByRole("button", { name: "Add Highlight", exact: true })
      .or(page.getByRole("button", { name: /Add Your First Highlight/i }))
      .first();
    await btn.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await dialog.locator("input").nth(0).fill("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    await dialog.locator("input").nth(1).fill("E2E Test Highlight");

    await dialog.getByRole("button", { name: "Add Highlight" }).click();

    await expect(page.getByText("Highlight added successfully.")).toBeVisible({ timeout: 12_000 });
  });

  test("19. Role guard redirects player away from admin routes", async () => {
    await page.goto("/dashboard/admin/users");
    await page.waitForLoadState("networkidle");
    await expect(page).not.toHaveURL(/\/admin\/users/);
    await expect(page).toHaveURL(/\/dashboard\/player/);
  });
});
