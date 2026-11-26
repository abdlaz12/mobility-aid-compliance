import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const SIZES = { mobile: { width: 375, height: 812 }, tablet: { width: 768, height: 1024 }, desktop: { width: 1280, height: 800 } } as const;
const overflows = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);

async function login(page: Page, email = "family@example.test") {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("demo-password-1");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.locator("main h1")).toBeVisible();
}

test("family sees only their own patient, in plain words", async ({ page }) => {
  await login(page);
  const main = page.locator("main");
  await expect(main.getByRole("heading", { name: "Demo Patient A" })).toBeVisible();
  await expect(main.getByText("Demo Patient B")).toHaveCount(0);
  await expect(main.getByText(/Needs attention: not using the walker/)).toBeVisible();
  await expect(main.getByText("The care team has been notified.")).toBeVisible();
  // No staff names or detector numbers for family.
  await expect(main.getByText("Demo Nurse")).toHaveCount(0);
  await expect(main.getByText(/confidence|%/)).toHaveCount(0);
});

test("family 2 sees the other patient, who has a closed escalation", async ({ page }) => {
  await login(page, "family2@example.test");
  const main = page.locator("main");
  await expect(main.getByRole("heading", { name: "Demo Patient B" })).toBeVisible();
  await expect(main.getByText("Demo Patient A")).toHaveCount(0);
});

test("alert history explains each level and states that no images are captured", async ({ page }) => {
  await login(page);
  await expect(page.getByRole("heading", { name: "Alert history" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "What do these alerts mean?" })).toBeVisible();
  await expect(page.getByText("No camera images are captured.")).toBeVisible();
});

test("a family member cannot open nurse or admin pages", async ({ page }) => {
  await login(page);
  for (const path of ["/dashboard", "/alerts/1", "/patients/1", "/admin/patients"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/home$/);
  }
});

for (const [size, viewport] of Object.entries(SIZES)) {
  test.describe(`at ${size}`, () => {
    test.use({ viewport });
    test("home fits and has no axe violations in light and dark", async ({ page }) => {
      await login(page);
      expect(await overflows(page)).toBe(false);
      for (const theme of ["light", "dark"]) {
        await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
        const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
        expect(r.violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
      }
    });
  });
}
