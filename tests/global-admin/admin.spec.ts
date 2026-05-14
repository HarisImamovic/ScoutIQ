import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import { LoginPage } from "../pages/LoginPage";
import { env } from "../utils/env";

test.describe("Global Admin", () => {
  test.describe.configure({ mode: "serial" });

  let page: Page;
  let context: BrowserContext;
  let clubName: string;
  let leagueName: string;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    const lp = new LoginPage(page);
    await lp.loginAndWait(env.adminEmail, env.adminPassword);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test("5. Clubs page loads", async () => {
    await page.goto("/dashboard/admin/clubs");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: "Clubs" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Add Club/ })).toBeVisible();
  });

  test("6. Create a club", async () => {
    clubName = `E2E Club ${Date.now()}`;

    await page.getByRole("button", { name: /Add Club/ }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await dialog.locator("input").first().fill(clubName);

    await dialog.getByRole("combobox").first().click();
    await page.getByRole("option").first().click();

    await dialog.getByRole("button", { name: "Add Club" }).click();

    await expect(page.getByText("Club created successfully.")).toBeVisible({ timeout: 12_000 });
    await expect(page.getByRole("row").filter({ hasText: clubName })).toBeVisible();
  });

  test("7. Delete the created club", async () => {
    const row = page.getByRole("row").filter({ hasText: clubName });
    await row.getByRole("button").nth(2).click();

    const alertDialog = page.getByRole("alertdialog");
    await expect(alertDialog).toBeVisible();
    await alertDialog.getByRole("button", { name: "Delete" }).click();

    await expect(page.getByRole("row").filter({ hasText: clubName })).not.toBeVisible();
    await expect(page.getByText("Club deleted successfully.")).toBeVisible({ timeout: 12_000 });
  });

  test("8. Users page loads", async () => {
    await page.goto("/dashboard/admin/users");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: "Users" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Add User/ })).toBeVisible();
  });

  test("10. Leagues page loads", async () => {
    await page.goto("/dashboard/admin/leagues");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: "Leagues" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Add League/ })).toBeVisible();
  });

  test("11. Create a league", async () => {
    leagueName = `E2E League ${Date.now()}`;

    await page.getByRole("button", { name: /Add League/ }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    const inputs = dialog.locator("input[type='text'], input:not([type])");
    await inputs.nth(0).fill(leagueName);
    await inputs.nth(1).fill("England");

    await dialog.getByRole("button", { name: "Add League" }).click();

    await expect(page.getByText("League created successfully.")).toBeVisible({ timeout: 12_000 });
    await expect(page.getByRole("row").filter({ hasText: leagueName })).toBeVisible();
  });

  test("12. Delete the created league", async () => {
    const row = page.getByRole("row").filter({ hasText: leagueName });
    await row.getByRole("button").nth(2).click();

    const alertDialog = page.getByRole("alertdialog");
    await expect(alertDialog).toBeVisible();
    await alertDialog.getByRole("button", { name: "Delete" }).click();

    await expect(page.getByRole("row").filter({ hasText: leagueName })).not.toBeVisible();
    await expect(page.getByText("League deleted successfully.")).toBeVisible({ timeout: 12_000 });
  });
});
