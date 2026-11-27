import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const SIZES = { mobile: { width: 375, height: 812 }, tablet: { width: 768, height: 1024 }, desktop: { width: 1280, height: 800 } } as const;

async function login(page: Page, email = "nurse@example.test", password = "demo-password-1") {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.locator("main h1")).toBeVisible();
}
const openAccount = async (page: Page) => { await page.getByRole("link", { name: "Account", exact: true }).first().click(); await expect(page.locator("main h1")).toHaveText("Account"); };

test("change password validates, then the new password works at the next sign-in", async ({ page }) => {
  await login(page);
  await openAccount(page);
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page.getByText("Enter your current password.")).toBeVisible();
  await expect(page.getByText("Use at least 10 characters.")).toBeVisible();
  await page.getByLabel("Current password").fill("not-the-password");
  await page.getByLabel("New password", { exact: true }).fill("a-new-password-1");
  await page.getByLabel("Repeat new password").fill("different-password");
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page.getByText("The two new passwords do not match.")).toBeVisible();
  await page.getByLabel("Repeat new password").fill("a-new-password-1");
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page.getByText("That is not your current password.")).toBeVisible();
  await page.getByLabel("Current password").fill("demo-password-1");
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page.getByText("Your password was changed.")).toBeVisible();
  // Sign out by the menu and sign in again, inside the same page session (the mock keeps passwords in memory).
  await page.getByRole("button", { name: "Sign out" }).first().click();
  await page.getByLabel("Email").fill("nurse@example.test");
  await page.getByLabel("Password").fill("demo-password-1");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByText(/wrong|incorrect/i).first()).toBeVisible();
  await page.getByLabel("Password").fill("a-new-password-1");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.locator("main h1")).toBeVisible();
});

test("five wrong current passwords lock password changes", async ({ page }) => {
  await login(page);
  await openAccount(page);
  for (let i = 0; i < 5; i++) {
    await page.getByLabel("Current password").fill(`wrong-password-${i}`);
    await page.getByLabel("New password", { exact: true }).fill("a-new-password-1");
    await page.getByLabel("Repeat new password").fill("a-new-password-1");
    await page.getByRole("button", { name: "Change password" }).click();
    await expect(page.getByText("That is not your current password.")).toBeVisible();
  }
  await page.getByLabel("Current password").fill("demo-password-1");
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page.getByText("Too many wrong attempts. Try again later.")).toBeVisible();
});

test("a Pushover key is 30 letters and digits, and can be removed", async ({ page }) => {
  await login(page);
  await openAccount(page);
  const save = page.getByRole("button", { name: "Save key" });
  const field = page.getByLabel("30-character Pushover user key");
  await expect(save).toBeDisabled();
  await field.fill("short");
  await expect(save).toBeDisabled();
  await field.fill("abcdefghij0123456789ABCDEFGHI!");
  await expect(page.getByText("Use letters and digits only.")).toBeVisible();
  await expect(save).toBeDisabled();
  await field.fill("abcdefghij0123456789ABCDEFGHIJ");
  await expect(page.getByText("30/30 characters")).toBeVisible();
  await save.click();
  await expect(page.getByText("Pushover key saved.")).toBeVisible();
  await field.fill("");
  await save.click();
  await expect(page.getByText("Pushover key removed.")).toBeVisible();
});

test("family sees the Pushover section; admin does not", async ({ page }) => {
  await login(page, "family@example.test");
  await openAccount(page);
  await expect(page.getByRole("heading", { name: "Pushover notifications" })).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).first().click();
  await login(page, "admin@example.test");
  await openAccount(page);
  await expect(page.getByRole("heading", { name: "Pushover notifications" })).toHaveCount(0);
});

test("a new room can be typed when adding a patient and is then offered for other patients", async ({ page }) => {
  await login(page, "admin@example.test");
  await page.getByRole("link", { name: "Patients", exact: true }).first().click();
  await page.getByRole("button", { name: "Add patient" }).click();
  await expect(page.locator("main h1")).toHaveText("Add patient");
  await page.getByLabel("Patient code").fill("P-0099");
  await page.getByLabel("Full name").fill("Room Tester");
  await page.getByLabel("Room").fill("R-299");
  await page.getByLabel("Prescribed aid").selectOption("Cane");
  await page.getByLabel("Patient", { exact: true }).check();
  await page.getByRole("button", { name: "Add patient" }).click();
  await expect(page.getByRole("heading", { name: "Room Tester" })).toBeVisible();
  await expect(page.getByText(/Room R-299/)).toBeVisible();
  await page.getByRole("link", { name: "Patients", exact: true }).first().click();
  await page.getByRole("button", { name: "Add patient" }).click();
  await expect(page.locator("main h1")).toHaveText("Add patient");
  await expect(page.locator("#known-rooms option[value='R-299']")).toHaveCount(1);
});

for (const [size, viewport] of Object.entries(SIZES)) {
  test(`account fits and has no axe violations at ${size}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await login(page);
    await openAccount(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
    for (const theme of ["light", "dark"]) {
      await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
      const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      expect(r.violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
    }
  });
}
