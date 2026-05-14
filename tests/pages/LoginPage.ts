import type { Page } from "@playwright/test";

export class LoginPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto("/login");
    await this.page.waitForLoadState("networkidle");
  }

  async fillCredentials(email: string, password: string) {
    await this.page.getByLabel("Email").fill(email);
    await this.page.getByLabel("Password").fill(password);
  }

  async submit() {
    await this.page.getByRole("button", { name: "Sign In" }).click();
  }

  async loginAndWait(email: string, password: string) {
    await this.goto();
    await this.fillCredentials(email, password);
    await this.submit();
    await this.page.waitForURL("**/dashboard/**", { timeout: 15_000 });
    await this.page.waitForLoadState("networkidle");
  }
}
