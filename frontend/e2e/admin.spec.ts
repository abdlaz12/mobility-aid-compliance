import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const SIZES = { mobile: { width: 375, height: 812 }, tablet: { width: 768, height: 1024 }, desktop: { width: 1280, height: 800 } } as const;
const overflows = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill("admin@example.test");
  await page.getByLabel("Password").fill("demo-password-1");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.locator("main h1")).toBeVisible();
}
const go = async (page: Page, path: string) => { await page.goto(path); await expect(page.locator("main h1")).toBeVisible(); };
// A full reload resets the mock data and the session, so tests that need state move by clicking instead.
const nav = async (page: Page, name: string) => {
  await page.getByRole("link", { name, exact: true }).first().click();
  await expect(page.locator("main h1")).toHaveText(name);
};

test.describe("patients", () => {
  test("list filters by status and searches", async ({ page }) => {
    await login(page);
    await nav(page, "Patients");
    await expect(page.getByRole("link", { name: "Demo Patient A" })).toBeVisible();
    await page.getByLabel("Search name, code, or room").fill("R-205");
    await expect(page.getByRole("link", { name: "Demo Patient A" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Demo Patient B" })).toBeVisible();
    await page.getByRole("button", { name: "Discharged" }).click();
    await expect(page.getByText("No patients match.")).toBeVisible();
  });

  test("add patient validates, rejects a used code, then creates", async ({ page }) => {
    await login(page);
    await nav(page, "Patients");
    await page.getByRole("button", { name: "Add patient" }).click();
    await expect(page.locator("main h1")).toHaveText("Add patient");
    await page.getByRole("button", { name: "Add patient" }).click();
    await expect(page.getByText("Enter a patient code.")).toBeVisible();
    await expect(page.getByText("Record who gave consent.")).toBeVisible();
    await page.getByLabel("Patient code").fill("P-0042");
    await page.getByLabel("Full name").fill("New Person");
    await page.getByLabel("Room").fill("R-201");
    await page.getByLabel("Prescribed aid").selectOption("Cane");
    await page.getByLabel("Patient", { exact: true }).check();
    await page.getByRole("button", { name: "Add patient" }).click();
    await expect(page.getByText("This patient code is already in use.")).toBeVisible();
    await page.getByLabel("Patient code").fill("P-0044");
    await page.getByRole("button", { name: "Add patient" }).click();
    await expect(page.getByRole("heading", { name: "New Person" })).toBeVisible();
  });

  test("withdrawing consent stops sample upload; one sample can be deleted", async ({ page }) => {
    await login(page);
    await nav(page, "Patients");
    await page.getByRole("link", { name: "Demo Patient A" }).click();
    await page.getByRole("button", { name: "ReID enrolment" }).click();
    await expect(page.getByText("Sample 03")).toBeVisible();
    await page.getByRole("button", { name: "Delete sample 03" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete sample" }).click();
    await expect(page.getByText("Sample 03")).toHaveCount(0);
    await expect(page.getByText("Sample 02")).toBeVisible();
    await page.getByRole("button", { name: "Withdraw consent" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Withdraw consent" }).click();
    await expect(page.getByText("No consent is recorded", { exact: false })).toBeVisible();
    await expect(page.getByText("No calibration samples")).toBeVisible();
    await expect(page.getByRole("button", { name: "Add samples" })).toBeDisabled();
  });

  test("prescription change is recorded in the history; a repeated aid is refused", async ({ page }) => {
    await login(page);
    await nav(page, "Patients");
    await page.getByRole("link", { name: "Demo Patient A" }).click();
    await page.getByRole("button", { name: "Prescribed aid" }).click();
    await page.getByLabel("Change prescription").selectOption("Walker");
    await page.getByRole("button", { name: "Change prescription" }).click();
    await expect(page.getByText("already the current prescription")).toBeVisible();
    await page.getByLabel("Change prescription").selectOption("Cane");
    await page.getByRole("button", { name: "Change prescription" }).click();
    await expect(page.getByText("Prescription changed to cane.")).toBeVisible();
  });

  test("discharge and reactivate", async ({ page }) => {
    await login(page);
    await nav(page, "Patients");
    await page.getByRole("link", { name: "Demo Patient B" }).click();
    await page.getByRole("button", { name: "Danger zone" }).click();
    await page.getByRole("button", { name: "Discharge patient" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Discharge patient" }).click();
    await expect(page.getByText("Discharged").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Discharge patient" })).toBeDisabled();
    await page.getByRole("button", { name: "Reactivate" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Reactivate patient" }).click();
    await expect(page.getByText("Patient reactivated.")).toBeVisible();
  });

  test("an inactive caregiver cannot stay assigned", async ({ page }) => {
    await login(page);
    await nav(page, "Patients");
    await page.getByRole("link", { name: "Demo Patient B" }).click();
    await page.getByRole("button", { name: "Caregivers" }).click();
    await page.getByRole("button", { name: "Save caregivers" }).click();
    await expect(page.getByText("Only active nurses and family members can be assigned.")).toBeVisible();
    await page.getByLabel("Demo Family 2").uncheck();
    await page.getByRole("button", { name: "Save caregivers" }).click();
    await expect(page.getByText("Caregivers saved.")).toBeVisible();
  });
});

test.describe("users", () => {
  test("adds a user, refuses a duplicate email and a short password", async ({ page }) => {
    await login(page);
    await nav(page, "Users");
    await page.getByRole("button", { name: "Add user" }).click();
    await page.getByLabel("Name").fill("New Nurse");
    await page.getByLabel("Email").fill("nurse@example.test");
    await page.getByLabel("Role").selectOption("Nurse");
    await page.getByLabel("Starting password").fill("short");
    await page.getByRole("button", { name: "Add user" }).click();
    await expect(page.getByText("Use at least 10 characters.")).toBeVisible();
    await page.getByLabel("Starting password").fill("long-enough-pass");
    await page.getByRole("button", { name: "Add user" }).click();
    await expect(page.getByText("An account with this email already exists.")).toBeVisible();
    await page.getByLabel("Email").fill("new.nurse@example.test");
    await page.getByRole("button", { name: "Add user" }).click();
    await expect(page.getByRole("heading", { name: "New Nurse" })).toBeVisible();
  });

  test("an admin cannot deactivate themselves but can deactivate someone else", async ({ page }) => {
    await login(page);
    await nav(page, "Users");
    await page.getByRole("link", { name: "Demo Admin" }).click();
    await page.getByRole("button", { name: "Deactivate", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Deactivate" }).click();
    await expect(page.getByText("You cannot deactivate your own account.")).toBeVisible();
    await page.getByRole("link", { name: "Users", exact: true }).first().click();
    await page.getByRole("link", { name: "Demo Nurse 2" }).click();
    await page.getByRole("button", { name: "Deactivate", exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Deactivate" }).click();
    await expect(page.getByText("User deactivated.")).toBeVisible();
  });

  test("reset password shows a temporary password once", async ({ page }) => {
    await login(page);
    await nav(page, "Users");
    await page.getByRole("link", { name: "Demo Nurse", exact: true }).click();
    await page.getByRole("button", { name: "Reset password" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Reset password" }).click();
    await expect(page.getByText("Temporary password", { exact: true })).toBeVisible();
  });
});

test.describe("settings", () => {
  test("validates, resets a single value, and saves", async ({ page }) => {
    await login(page);
    await nav(page, "Settings");
    const save = page.getByRole("button", { name: "Save settings" });
    await expect(save).toBeDisabled();
    await page.getByLabel("Aid confidence threshold").fill("1.5");
    await expect(page.getByText("Enter a number from 0 to 1.")).toBeVisible();
    await expect(save).toBeDisabled();
    await page.getByRole("button", { name: "Reset Aid confidence threshold to default" }).click();
    await expect(page.getByLabel("Aid confidence threshold")).toHaveValue("0.60");
    await page.getByLabel("Acknowledgement timeout in minutes").fill("5");
    await save.click();
    await expect(page.getByText("Settings saved.")).toBeVisible();
    await expect(page.getByText("changed from default")).toBeVisible();
  });
});

test("a nurse cannot open admin pages", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Nurse", exact: true }).click();
  for (const p of ["/admin/patients", "/admin/users", "/admin/settings"]) { await page.goto(p); await expect(page).toHaveURL(/\/dashboard$/); }
});

for (const [size, viewport] of Object.entries(SIZES)) {
  test.describe(`at ${size}`, () => {
    test.use({ viewport });
    for (const path of ["/admin/patients", "/admin/patients/new", "/admin/patients/1", "/admin/users", "/admin/users/new", "/admin/users/2", "/admin/settings"]) {
      test(`${path} fits and has no axe violations in light and dark`, async ({ page }) => {
        await login(page);
        await go(page, path);
        expect(await overflows(page)).toBe(false);
        for (const theme of ["light", "dark"]) {
          await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
          const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
          expect(r.violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
        }
      });
    }
  });
}
