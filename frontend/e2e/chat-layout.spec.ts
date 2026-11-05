import { expect, request as playwrightRequest, test, type APIRequestContext } from "@playwright/test";
import { ADMIN, createMember, expectInViewport, expectNoHorizontalOverflow, isMobile, login, shot, signedIn, type Account } from "./helpers";

const LONG_WORD = "https://personae.men/catalogo/" + "semespacos".repeat(18);
const LONG_TEXT =
  "Boa noite! Gostaria de saber como funciona a agenda para o próximo fim de semana em São Paulo, se há disponibilidade e quais são os próximos passos para confirmar. Obrigado.";

test.describe("chat screens on every size", () => {
  let api: APIRequestContext;
  let member: Account;
  const baseURL = process.env.E2E_BASE_URL ?? "http://localhost";

  test.beforeAll(async () => {
    api = await playwrightRequest.newContext({ baseURL });
    await login(api, ADMIN.email, ADMIN.password);
    member = await createMember(api, "Valentina");
    const guest = await playwrightRequest.newContext({ baseURL });
    await login(guest, member.email, member.password);
    for (const body of ["Olá! Tudo bem?", LONG_TEXT, LONG_WORD, "Linha um\nLinha dois\nLinha três"]) {
      expect((await guest.post("/api/chat/messages", { data: { body } })).status()).toBe(200);
    }
    // Writing marks the member's side as read, so the house replies go last to leave two unread.
    for (const body of ["Olá Valentina, tudo ótimo por aqui.", "Temos agenda sim. Vou te passar os detalhes em seguida, combinado?"]) {
      expect((await api.post(`/api/admin/chat/conversations/${member.id}/messages`, { data: { body } })).status()).toBe(200);
    }
    await guest.dispose();
  });

  test.afterAll(async () => {
    await api.delete(`/api/admin/members/${member.id}`);
    await api.dispose();
  });

  test("member: launcher, open panel and composer fit the screen", async ({ browser }, info) => {
    const guest = await signedIn(browser, info, member.email, member.password);
    const page = guest.page;
    await page.goto("/catalog");
    const launcher = page.getByTestId("chat-launcher");
    await expect(launcher).toBeVisible();
    await expect(page.getByTestId("chat-unread")).toHaveText("2");
    await expectInViewport(page, "[data-testid=chat-launcher]", "launcher");
    await expectNoHorizontalOverflow(page, "catalog with launcher");
    await shot(page, info, "member-catalog");

    await launcher.click();
    const panel = page.getByTestId("chat-panel");
    await expect(panel).toBeVisible();
    await expect(page.getByTestId("chat-message").filter({ hasText: "Temos agenda sim" })).toBeVisible();
    await expectInViewport(page, "[data-testid=chat-panel]", "chat panel");
    await expectInViewport(page, "#chat-composer", "composer");
    await expectInViewport(page, "button[aria-label='Fechar conversa']", "close button");
    await expectNoHorizontalOverflow(page, "open chat");

    const panelBox = await panel.boundingBox();
    const bubbles = await page.getByTestId("chat-message").locator("div").evaluateAll((nodes) =>
      nodes.map((node) => {
        const box = node.getBoundingClientRect();
        return { left: box.left, right: box.right, scroll: node.scrollWidth - node.clientWidth };
      }),
    );
    for (const bubble of bubbles) {
      expect(bubble.right, "bubble stays inside the panel").toBeLessThanOrEqual((panelBox?.x ?? 0) + (panelBox?.width ?? 0) + 1);
      expect(bubble.scroll, "long words wrap inside the bubble").toBeLessThanOrEqual(1);
    }
    if (isMobile(info)) {
      const viewport = page.viewportSize()!;
      expect(panelBox?.width, "full width on phones").toBeGreaterThanOrEqual(viewport.width - 1);
      const fontSize = await page.locator("#chat-composer").evaluate((node) => parseFloat(getComputedStyle(node).fontSize));
      expect(fontSize, "16px+ avoids iOS zoom on focus").toBeGreaterThanOrEqual(16);
      const sendBox = await page.getByRole("button", { name: "Enviar", exact: true }).boundingBox();
      expect(sendBox?.height, "touch target").toBeGreaterThanOrEqual(44);
    }
    await shot(page, info, "member-chat-open");

    await page.locator("#chat-composer").fill("Texto de várias linhas\n".repeat(8).trim());
    await expectInViewport(page, "#chat-composer", "composer while typing a long text");
    const composerHeight = (await page.locator("#chat-composer").boundingBox())?.height ?? 0;
    expect(composerHeight, "composer grows but stays bounded").toBeLessThanOrEqual(130);
    await shot(page, info, "member-chat-typing");
    await guest.context.close();
  });

  test("house: inbox and conversation fit the screen", async ({ browser }, info) => {
    const mobile = isMobile(info);
    const house = await signedIn(browser, info, ADMIN.email, ADMIN.password);
    const page = house.page;
    await page.goto("/admin/chat");
    const row = page.locator(`[data-testid=conversation-row][data-member="${member.id}"]`);
    await expect(row).toBeVisible();
    await expectNoHorizontalOverflow(page, "inbox");
    await expectInViewport(page, `[data-testid=conversation-row][data-member="${member.id}"]`, "conversation row");
    await shot(page, info, "house-inbox");

    await row.click();
    await expect(page.getByTestId("chat-conversation").getByText("Temos agenda sim")).toBeVisible();
    if (mobile) {
      await expect(page.getByTestId("chat-list")).toBeHidden();
      await expectInViewport(page, "button[aria-label='Voltar para as conversas']", "back button");
    } else {
      await expect(page.getByTestId("chat-list")).toBeVisible();
    }
    await expectInViewport(page, "#chat-composer", "house composer");
    await expectNoHorizontalOverflow(page, "house conversation");
    const pageScroll = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
    expect(pageScroll, "the chat page itself does not scroll; only the messages do").toBeLessThanOrEqual(1);
    await shot(page, info, "house-conversation");

    if (mobile) {
      await page.getByRole("button", { name: "Voltar para as conversas" }).click();
      await expect(page.getByTestId("chat-list")).toBeVisible();
      await expect(page.getByTestId("chat-conversation")).toBeHidden();
    }
    await house.context.close();
  });

  test("admin and member pages keep working with the chat on (no overflow, no overlap with the header)", async ({ browser }, info) => {
    const house = await signedIn(browser, info, ADMIN.email, ADMIN.password);
    for (const path of ["/admin", "/admin/members", `/admin/members/${member.id}`]) {
      await house.page.goto(path);
      await expect(house.page.getByRole("link", { name: /Conversas/ }).locator("visible=true").first()).toBeVisible();
      await expectNoHorizontalOverflow(house.page, path);
    }
    await shot(house.page, info, "house-member-file");
    await house.context.close();

    const guest = await signedIn(browser, info, member.email, member.password);
    await guest.page.goto("/catalog");
    const header = await guest.page.locator("header").first().boundingBox();
    const launcher = await guest.page.getByTestId("chat-launcher").boundingBox();
    expect(launcher && header ? launcher.y > header.y + header.height : false, "launcher does not cover the header").toBe(true);
    await guest.context.close();
  });
});
