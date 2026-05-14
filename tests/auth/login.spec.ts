import { test, expect } from "@playwright/test";
import { LoginPage } from "../pages/LoginPage";
import { env } from "../utils/env";

test("1. Valid credentials redirect to /dashboard", async ({ page }) => {
  const lp = new LoginPage(page);
  await lp.goto();
  await lp.fillCredentials(env.adminEmail, env.adminPassword);
  await lp.submit();
  await page.waitForURL("**/dashboard/**", { timeout: 15_000 });
  await page.waitForLoadState("networkidle");
  await expect(page).toHaveURL(/\/dashboard/);
});

test("2. Wrong password shows error toast", async ({ page }) => {
  const lp = new LoginPage(page);
  await lp.goto();
  await lp.fillCredentials(env.adminEmail, "WrongPass999!");
  await lp.submit();
  await expect(page.getByText("Invalid email or password.")).toBeVisible({ timeout: 10_000 });
});

test("3. Empty form shows inline validation errors", async ({ page }) => {
  const lp = new LoginPage(page);
  await lp.goto();
  await lp.submit();
  await expect(page.getByText("Email is required.")).toBeVisible();
  await expect(page.getByText("Password is required.")).toBeVisible();
});

test("4. Redirect preserves destination after login", async ({ page }) => {
  await page.goto("/dashboard/admin/users");
  await page.waitForLoadState("networkidle");
  await expect(page).toHaveURL(/\/login/);

  const lp = new LoginPage(page);
  await lp.fillCredentials(env.adminEmail, env.adminPassword);
  await lp.submit();
  await page.waitForURL("**/dashboard/admin/users", { timeout: 15_000 });
  await page.waitForLoadState("networkidle");
  await expect(page).toHaveURL(/\/dashboard\/admin\/users/);
});
