import { expect, type APIRequestContext, type Browser, type BrowserContext, type Page, type TestInfo } from "@playwright/test";

export const ADMIN = {
  email: process.env.E2E_ADMIN_EMAIL ?? "iris.p@example.org",
  password: process.env.E2E_ADMIN_PASSWORD ?? "PersonaeAdmin#2026",
};

export type Account = { id: string; email: string; password: string; firstName: string; lastName: string };

const stamp = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export async function login(request: APIRequestContext, email: string, password: string) {
  const response = await request.post("/api/auth/login", { data: { email, password, remember: false } });
  expect(response.status(), `login ${email}`).toBe(200);
}

/** Creates an active member through the admin API (direct entry + password link), like the house does. */
export async function createMember(admin: APIRequestContext, firstName = "Membro"): Promise<Account> {
  const id = stamp();
  const email = `e2e.${id}@example.org`;
  const lastName = `Teste ${id.slice(-4).toUpperCase()}`;
  const created = await admin.post("/api/admin/members", {
    multipart: {
      firstName,
      lastName,
      email,
      birthDate: "1990-05-10",
      phone: "+55 11 90000-0000",
      city: "São Paulo",
      state: "SP",
      country: "Brasil",
      contactAuthorized: "true",
      locale: "pt",
      sendEmail: "false",
    },
  });
  expect(created.status(), "create member").toBe(200);
  const issued = (await created.json()) as { member: { id: string }; link: string };
  const token = new URL(issued.link).searchParams.get("token");
  expect(token, "invite token").toBeTruthy();
  const password = `Senha${id}9`;
  const set = await admin.post("/api/auth/set-password", { data: { token, password } });
  expect(set.status(), "set password").toBe(200);
  // set-password signs the request context in as the member; sign the admin back in.
  await login(admin, ADMIN.email, ADMIN.password);
  return { id: issued.member.id, email, password, firstName, lastName };
}

/** A separate browser context using the current project's device (desktop, phone...). */
export async function actor(browser: Browser, info: TestInfo): Promise<BrowserContext> {
  const use = info.project.use;
  return browser.newContext({
    baseURL: use.baseURL,
    viewport: use.viewport,
    userAgent: use.userAgent,
    deviceScaleFactor: use.deviceScaleFactor,
    isMobile: use.isMobile,
    hasTouch: use.hasTouch,
    locale: "pt-BR",
  });
}

export async function signedIn(browser: Browser, info: TestInfo, email: string, password: string) {
  const context = await actor(browser, info);
  await login(context.request, email, password);
  const page = await context.newPage();
  return { context, page };
}

export const isMobile = (info: TestInfo) => Boolean(info.project.use.isMobile);

/** Fails when the page scrolls sideways or an element sticks out of the viewport. */
export async function expectNoHorizontalOverflow(page: Page, label: string) {
  const overflow = await page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const offenders = Array.from(document.querySelectorAll<HTMLElement>("body *"))
      .filter((element) => {
        const style = getComputedStyle(element);
        if (style.position === "fixed" && style.visibility === "hidden") return false;
        const box = element.getBoundingClientRect();
        return box.width > 0 && (box.right > width + 1 || box.left < -1);
      })
      .filter((element) => !element.closest("[data-allow-overflow]"))
      .filter((element) => {
        for (let parent = element.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
          if (/(auto|scroll)/.test(getComputedStyle(parent).overflowX)) return false;
        }
        return true;
      })
      .slice(0, 5)
      .map((element) => `${element.tagName.toLowerCase()}.${String(element.className).slice(0, 60)}`);
    return { scroll: document.documentElement.scrollWidth - width, offenders };
  });
  expect(overflow.scroll, `${label}: page scrolls sideways`).toBeLessThanOrEqual(1);
  expect(overflow.offenders, `${label}: elements outside the screen`).toEqual([]);
}

/** Element must be fully inside the viewport (not cut off, not hidden behind the edges). */
export async function expectInViewport(page: Page, selector: string, label: string) {
  const box = await page.locator(selector).first().boundingBox();
  const viewport = page.viewportSize();
  expect(box, `${label}: not rendered`).not.toBeNull();
  if (!box || !viewport) return;
  expect(box.x, `${label}: cut on the left`).toBeGreaterThanOrEqual(-1);
  expect(box.y, `${label}: cut on top`).toBeGreaterThanOrEqual(-1);
  expect(box.x + box.width, `${label}: cut on the right`).toBeLessThanOrEqual(viewport.width + 1);
  expect(box.y + box.height, `${label}: cut at the bottom`).toBeLessThanOrEqual(viewport.height + 1);
}

export async function shot(page: Page, info: TestInfo, name: string) {
  await page.screenshot({ path: `e2e-screens/${info.project.name}-${name}.png`, fullPage: false });
}
