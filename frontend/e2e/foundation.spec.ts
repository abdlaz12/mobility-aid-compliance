import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const SIZES = { mobile: { width: 375, height: 812 }, tablet: { width: 768, height: 1024 }, desktop: { width: 1280, height: 800 } } as const;
type Size = keyof typeof SIZES;

async function asRole(page: Page, role: "Nurse" | "Family" | "Admin") {
  await page.goto("/login");
  await page.getByRole("button", { name: role, exact: true }).click();
  await expect(page.getByText("Built in the next phase")).toBeVisible();
}
const overflows = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);

for (const [size, viewport] of Object.entries(SIZES) as [Size, (typeof SIZES)[Size]][]) {
  test.describe(`at ${size} (${viewport.width}px)`, () => {
    test.use({ viewport });

    test("sign-in fits the screen", async ({ page }) => {
      await page.goto("/login");
      await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
      expect(await overflows(page)).toBe(false);
    });

    for (const role of ["Nurse", "Family", "Admin"] as const) {
      test(`${role} shell fits and shows the right navigation`, async ({ page }) => {
        await asRole(page, role);
        expect(await overflows(page)).toBe(false);
        const sidebar = page.getByRole("complementary", { name: "Main navigation" });
        const bottom = page.locator("nav[aria-label='Main navigation']").last();
        if (size === "mobile") {
          await expect(sidebar).toBeHidden();
          await expect(bottom).toBeVisible();
        } else {
          await expect(sidebar).toBeVisible();
          await expect(bottom).toBeHidden();
          // Tablet shows icons only, desktop shows the words.
          const label = sidebar.getByText(role === "Family" ? "Home" : "Dashboard", { exact: true });
          if (size === "desktop") await expect(label).toBeVisible(); else await expect(label).toBeHidden();
        }
      });
    }

    for (const theme of ["light", "dark"] as const) {
      test(`accessibility (axe, WCAG 2.1 AA) in ${theme} mode`, async ({ page }) => {
        await page.addInitScript((t) => localStorage.setItem("theme", t), theme);
        await page.goto("/login");
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        const tags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];
        const signIn = await new AxeBuilder({ page }).withTags(tags).analyze();
        expect(signIn.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
        await page.getByRole("button", { name: "Admin", exact: true }).click();
        await expect(page.getByText("Built in the next phase")).toBeVisible();
        const shell = await new AxeBuilder({ page }).withTags(tags).analyze();
        expect(shell.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
      });
    }

    test("every control in the shell is at least 44 x 44 px", async ({ page }) => {
      await asRole(page, "Admin");
      const small = await page.evaluate(() => {
        const out: string[] = [];
        document.querySelectorAll<HTMLElement>("header button, header a, nav a, nav button, aside a").forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0 || el.classList.contains("sr-only")) return; // hidden or off-screen skip link
          if (r.width < 44 || r.height < 44) out.push(`${el.getAttribute("aria-label") ?? el.textContent?.trim()} ${Math.round(r.width)}x${Math.round(r.height)}`);
        });
        return out;
      });
      expect(small).toEqual([]);
    });
  });
}

test.describe("sign-in behaviour", () => {
  test("a wrong password is refused with a clear message", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("nurse@example.test");
    await page.getByLabel("Password").fill("not the password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("alert")).toHaveText(/Wrong email or password\./);
    await expect(page).toHaveURL(/\/login$/);
  });

  test("five wrong passwords lock the account, even for the right password, but not other accounts", async ({ page }) => {
    await page.goto("/login");
    const attempt = async (email: string, password: string) => {
      await page.getByLabel("Email").fill(email);
      await page.getByLabel("Password").fill(password);
      await page.getByRole("button", { name: "Sign in" }).click();
    };
    for (let i = 0; i < 5; i++) await attempt("nurse2@example.test", `wrong ${i}`);
    await attempt("nurse2@example.test", "demo-password-1");
    await expect(page.getByRole("alert")).toContainText("Too many failed attempts.");
    await expect(page).toHaveURL(/\/login$/);
    await attempt("family2@example.test", "demo-password-1");
    await expect(page).toHaveURL(/\/home$/);
  });

  test("each role lands on its own home", async ({ page }) => {
    for (const [email, url] of [["nurse@example.test", /\/dashboard$/], ["family@example.test", /\/home$/], ["admin@example.test", /\/dashboard$/]] as const) {
      await page.goto("/login");
      await page.getByLabel("Email").fill(email);
      await page.getByLabel("Password").fill("demo-password-1");
      await page.getByRole("button", { name: "Sign in" }).click();
      await expect(page).toHaveURL(url);
      await page.evaluate(() => sessionStorage.clear());
    }
  });
});

test.describe("access by role", () => {
  test("a visitor who is not signed in is sent to the sign-in page", async ({ page }) => {
    for (const path of ["/dashboard", "/admin/users", "/account", "/home"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login$/);
    }
  });

  test("a nurse cannot open admin pages, and a family member cannot open the dashboard", async ({ page }) => {
    await asRole(page, "Nurse");
    for (const path of ["/admin/users", "/admin/patients", "/admin/settings", "/home"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/dashboard$/);
    }
    await page.evaluate(() => sessionStorage.clear());
    await asRole(page, "Family");
    for (const path of ["/dashboard", "/admin/users", "/alerts/1", "/patients/1"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/home$/);
    }
  });

  test("an unknown page shows a not-found message inside the shell", async ({ page }) => {
    await asRole(page, "Nurse");
    await page.goto("/nothing-here");
    await expect(page.getByText("Page not found")).toBeVisible();
  });
});

test.describe("menu and theme", () => {
  test("on a phone the More menu holds the theme switch and Sign out", async ({ page }) => {
    await page.setViewportSize(SIZES.mobile);
    await asRole(page, "Nurse");
    await page.getByRole("button", { name: "More" }).click();
    const menu = page.getByRole("menu");
    await expect(menu.getByText("Demo Nurse")).toBeVisible();
    await menu.getByRole("menuitem", { name: /Sign out/ }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("the theme switch changes the theme and the choice survives a reload", async ({ page }) => {
    await page.addInitScript(() => { if (!localStorage.getItem("theme")) localStorage.setItem("theme", "light"); });
    await asRole(page, "Nurse");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page.getByRole("button", { name: "Switch to dark theme" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test("keyboard: the skip link is the first thing a tab reaches", async ({ page }) => {
    await asRole(page, "Nurse");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  });
});
