import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const SIZES = { mobile: { width: 375, height: 812 }, tablet: { width: 768, height: 1024 }, desktop: { width: 1280, height: 800 } } as const;
const overflows = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);

async function login(page: Page, email = "nurse@example.test") {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("demo-password-1");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

test.describe("dashboard", () => {
  test("lists pending alerts most severe first and scopes by nurse", async ({ page }) => {
    await login(page);
    const cards = page.getByRole("button", { name: /^Acknowledge/ });
    await expect(cards).toHaveCount(2);
    await expect(page.getByRole("link", { name: "Demo Patient A" }).first()).toBeVisible();
    // Escalated outranks warning.
    const html = await page.locator("main").innerText();
    expect(html.indexOf("Escalated")).toBeLessThan(html.indexOf("Warning"));
  });

  test("a second nurse only sees her own patient", async ({ page }) => {
    await login(page, "nurse2@example.test");
    await expect(page.getByRole("button", { name: /^Acknowledge/ })).toHaveCount(1);
    await expect(page.locator("main").getByText("Demo Patient A")).toHaveCount(0);
  });

  test("acknowledging from the dashboard removes the alert and confirms", async ({ page }) => {
    await login(page);
    await page.getByRole("button", { name: /^Acknowledge/ }).first().click();
    await expect(page.getByRole("button", { name: /^Acknowledge/ })).toHaveCount(1);
    await expect(page.getByText(/acknowledged/i).first()).toBeVisible();
  });
});

test.describe("alert detail", () => {
  test("shows timeline and delivery status, and acknowledges", async ({ page }) => {
    await login(page);
    await page.goto("/alerts/1");
    await expect(page.getByRole("heading", { name: "Mobility aid alert" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Timeline" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Delivery status" })).toBeVisible();
    await page.getByRole("button", { name: "Acknowledge", exact: true }).click();
    await expect(page.getByRole("button", { name: "Acknowledge", exact: true })).toHaveCount(0);
    await expect(page.getByText("Demo Nurse").first()).toBeVisible();
  });

  test("shows the already-acknowledged state when someone was faster", async ({ page }) => {
    await login(page);
    await page.goto("/alerts/2");
    await page.getByText("Prototype tools").click();
    await page.getByRole("button", { name: /another nurse acknowledges first/ }).click();
    await page.getByRole("button", { name: "Acknowledge", exact: true }).click();
    await expect(page.getByText("Already acknowledged")).toBeVisible();
  });

  test("an alert outside your scope looks like it does not exist", async ({ page }) => {
    await login(page, "nurse2@example.test");
    await page.goto("/alerts/1");
    await expect(page.getByText(/not found|doesn.t exist/i).first()).toBeVisible();
    await page.goto("/patients/1");
    await expect(page.getByText(/not found|doesn.t exist/i).first()).toBeVisible();
  });
});

test.describe("patient page", () => {
  test("switches between alerts and detections", async ({ page }) => {
    await login(page);
    await page.goto("/patients/1");
    await expect(page.getByRole("heading", { name: "Demo Patient A" })).toBeVisible();
    await page.getByRole("button", { name: "Detections", pressed: false }).click();
    await expect(page.getByText(/Identity/).first()).toBeVisible();
  });
});

for (const [size, viewport] of Object.entries(SIZES)) {
  test.describe(`at ${size}`, () => {
    test.use({ viewport });
    for (const path of ["/dashboard", "/alerts/1", "/patients/1"]) {
      test(`${path} fits, has no axe violations in light and dark`, async ({ page }) => {
        await login(page);
        await page.goto(path);
        await expect(page.locator("main h1")).toBeVisible();
        expect(await overflows(page)).toBe(false);
        for (const theme of ["light", "dark"]) {
          await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
          const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
          expect(r.violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
        }
      });
    }
    test("main-content buttons and links are at least 44px", async ({ page }) => {
      await login(page);
      for (const path of ["/dashboard", "/alerts/1"]) {
        await page.goto(path);
        const small = await page.locator("main").locator("button, a").evaluateAll((els) =>
          els.filter((e) => { const r = e.getBoundingClientRect(); return r.height > 0 && r.height < 44 && getComputedStyle(e).display !== "inline"; }).map((e) => e.textContent?.trim()));
        expect(small).toEqual([]);
      }
    });
  });
}
