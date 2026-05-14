import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import { LoginPage } from "../pages/LoginPage";
import { env } from "../utils/env";

test.describe("Club Admin", () => {
  test.describe.configure({ mode: "serial" });

  let page: Page;
  let context: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    const lp = new LoginPage(page);
    await lp.loginAndWait(env.clubAdminEmail, env.clubAdminPassword);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test("20. Club dashboard loads", async () => {
    await page.goto("/dashboard/club");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
