import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import { LoginPage } from "../pages/LoginPage";
import { env } from "../utils/env";

test.describe("Scout", () => {
  test.describe.configure({ mode: "serial" });

  let page: Page;
  let context: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    const lp = new LoginPage(page);
    await lp.loginAndWait(env.scoutEmail, env.scoutPassword);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test("13. Reports page loads", async () => {
    await page.goto("/dashboard/reports");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: "Scouting Reports" })).toBeVisible();
    await expect(page.getByRole("button", { name: /New Report/ })).toBeVisible();
  });

  test("14. Create a scouting report", async () => {
    await page.getByRole("button", { name: /New Report/ }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await dialog.getByRole("combobox").first().click();
    await page.getByRole("option").first().click();

    await dialog.locator("input[type='number']").fill("85");

    await dialog.locator("textarea").fill("Strong technical skills and excellent positioning.");

    await dialog.getByRole("button", { name: "Create Report" }).click();

    await expect(page.getByText("Report created successfully.")).toBeVisible({ timeout: 12_000 });
  });

  test("15. Delete the created report", async () => {
    await page.waitForLoadState("networkidle");

    const firstRow = page.getByRole("row").nth(1);
    await firstRow.getByRole("button", { name: "Delete report" }).click();

    const alertDialog = page.getByRole("alertdialog");
    await expect(alertDialog).toBeVisible();
    await alertDialog.getByRole("button", { name: "Delete" }).click();

    await expect(page.getByText("Report deleted successfully.")).toBeVisible({ timeout: 12_000 });
  });

  test("16. Players page loads", async () => {
    await page.goto("/dashboard/players");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: "Players" })).toBeVisible();
  });
});
