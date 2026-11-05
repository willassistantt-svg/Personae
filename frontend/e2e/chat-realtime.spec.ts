import { expect, request as playwrightRequest, test, type APIRequestContext, type Page, type WebSocketRoute } from "@playwright/test";
import { ADMIN, createMember, isMobile, login, signedIn, type Account } from "./helpers";

test.describe("chat in real time between the house and members", () => {
  let api: APIRequestContext;
  const baseURL = process.env.E2E_BASE_URL ?? "http://localhost";
  const created: Account[] = [];

  test.beforeAll(async () => {
    api = await playwrightRequest.newContext({ baseURL });
    await login(api, ADMIN.email, ADMIN.password);
  });

  test.afterAll(async () => {
    for (const member of created) await api.delete(`/api/admin/members/${member.id}`);
    await api.dispose();
  });

  async function newMember(name: string) {
    const member = await createMember(api, name);
    created.push(member);
    return member;
  }

  async function send(page: Page, text: string, mobile: boolean) {
    const box = page.locator("#chat-composer");
    await box.fill(text);
    if (mobile) await page.getByRole("button", { name: "Enviar", exact: true }).click();
    else await box.press("Enter");
  }

  async function openAdminChat(page: Page, mobile: boolean) {
    await page.goto("/admin/chat");
    await expect(page.getByTestId("chat-list")).toBeVisible();
    if (!mobile) await expect(page.getByText("Escolha uma conversa")).toBeVisible();
  }

  test("a member writes, the house is notified, replies, and unread counters stay right", async ({ browser }, info) => {
    const mobile = isMobile(info);
    const member = await newMember("Helena");
    const house = await signedIn(browser, info, ADMIN.email, ADMIN.password);
    const guest = await signedIn(browser, info, member.email, member.password);

    await openAdminChat(house.page, mobile);
    await guest.page.goto("/catalog");
    const launcher = guest.page.getByTestId("chat-launcher");
    await expect(launcher).toHaveAttribute("data-status", "open");
    await launcher.click();
    await expect(guest.page.getByTestId("chat-panel")).toBeVisible();
    await expect(guest.page.getByTestId("house-status")).toHaveAttribute("data-online", "true");
    await expect(guest.page.getByText("Seja bem-vindo.")).toBeVisible();

    await send(guest.page, "Olá, casa! Primeira mensagem.", mobile);
    await expect(guest.page.getByTestId("chat-message").filter({ hasText: "Primeira mensagem" })).toBeVisible();
    await expect(guest.page.getByText("Enviando...")).toHaveCount(0);

    const row = house.page.locator(`[data-testid=conversation-row][data-member="${member.id}"]`);
    await expect(row).toBeVisible();
    await expect(row.getByTestId("row-unread")).toHaveText("1");
    await expect(house.page.getByTestId("toast").filter({ hasText: `Nova mensagem de ${member.firstName}` })).toBeVisible();
    await expect(house.page.getByTestId("nav-chat-unread").locator("visible=true").first()).toHaveText("1");

    await row.click();
    await expect(house.page.getByTestId("chat-member-name")).toHaveText(`${member.firstName} ${member.lastName}`);
    await expect(house.page.getByTestId("member-status")).toHaveAttribute("data-online", "true");
    await expect(house.page.getByTestId("chat-conversation").getByText("Primeira mensagem")).toBeVisible();
    await expect(house.page.getByTestId("nav-chat-unread")).toHaveCount(0);
    if (!mobile) await expect(row.getByTestId("row-unread")).toHaveCount(0);

    await send(house.page, "Bem-vinda! Como podemos ajudar?", mobile);
    await expect(guest.page.getByTestId("chat-message").filter({ hasText: "Como podemos ajudar" })).toBeVisible();
    await expect(guest.page.getByTestId("chat-message").filter({ hasText: "Como podemos ajudar" })).toHaveAttribute("data-own", "false");

    await guest.page.getByRole("button", { name: "Fechar conversa" }).click();
    await send(house.page, "Mensagem com o chat fechado", mobile);
    await expect(guest.page.getByTestId("chat-unread")).toHaveText("1");
    await expect.poll(() => guest.page.title()).toMatch(/^\(1\) /);
    await guest.page.getByTestId("chat-launcher").click();
    await expect(guest.page.getByTestId("chat-message").filter({ hasText: "chat fechado" })).toBeVisible();
    await guest.page.getByRole("button", { name: "Fechar conversa" }).click();
    await expect(guest.page.getByTestId("chat-unread")).toHaveCount(0);
    await expect.poll(() => guest.page.title()).not.toMatch(/^\(\d+\) /);

    await house.context.close();
    await guest.context.close();
  });

  test("presence: members see when the house is online and the house sees members come and go", async ({ browser }, info) => {
    const mobile = isMobile(info);
    const member = await newMember("Clara");
    await api.post(`/api/admin/chat/conversations/${member.id}/messages`, { data: { body: "Oi Clara" } });
    const guest = await signedIn(browser, info, member.email, member.password);
    // An admin tab left open elsewhere (manual testing) keeps the house online; the offline checks only make sense without it.
    const houseAlreadyOnline: boolean = (await (await guest.context.request.get("/api/chat/status")).json()).houseOnline;
    await guest.page.goto("/catalog");
    await guest.page.getByTestId("chat-launcher").click();
    const houseStatus = guest.page.getByTestId("house-status");
    if (!houseAlreadyOnline) {
      await expect(houseStatus).toHaveAttribute("data-online", "false");
      await expect(houseStatus).toContainText("Fora do ar");
    }

    const house = await signedIn(browser, info, ADMIN.email, ADMIN.password);
    await house.page.goto(`/admin/chat?member=${member.id}`);
    await expect(houseStatus).toHaveAttribute("data-online", "true");
    await expect(house.page.getByTestId("member-status")).toHaveAttribute("data-online", "true");

    await guest.context.close();
    await expect(house.page.getByTestId("member-status")).toHaveAttribute("data-online", "false");
    if (!mobile) {
      await expect(house.page.locator(`[data-testid=conversation-row][data-member="${member.id}"] span.bg-emerald`)).toHaveCount(0);
    }

    const again = await signedIn(browser, info, member.email, member.password);
    await again.page.goto("/catalog");
    await expect(house.page.getByTestId("member-status")).toHaveAttribute("data-online", "true");
    await again.page.getByTestId("chat-launcher").click();
    await expect(again.page.getByTestId("house-status")).toHaveAttribute("data-online", "true");
    await house.context.close();
    if (!houseAlreadyOnline) await expect(again.page.getByTestId("house-status")).toHaveAttribute("data-online", "false");
    await again.context.close();
  });

  test("messages sent while the connection is down show up after it comes back", async ({ browser }, info) => {
    const member = await newMember("Lia");
    const guest = await signedIn(browser, info, member.email, member.password);
    let blocked = false;
    const sockets: WebSocketRoute[] = [];
    await guest.page.routeWebSocket("**/api/chat/socket", (ws) => {
      if (blocked) {
        ws.close({ code: 4002 });
        return;
      }
      sockets.push(ws);
      ws.connectToServer();
    });
    await guest.page.goto("/catalog");
    await guest.page.getByTestId("chat-launcher").click();
    await expect(guest.page.getByTestId("house-status")).not.toContainText("Reconectando");

    blocked = true;
    for (const ws of sockets) await ws.close({ code: 4001 });
    await expect(guest.page.getByTestId("house-status")).toContainText("Reconectando");
    await api.post(`/api/admin/chat/conversations/${member.id}/messages`, { data: { body: "Enviada durante a queda" } });
    await guest.page.waitForTimeout(2500);
    await expect(guest.page.getByTestId("house-status")).toContainText("Reconectando");

    blocked = false;
    await expect(guest.page.getByText("Enviada durante a queda")).toBeVisible({ timeout: 30_000 });
    await expect(guest.page.getByTestId("house-status")).not.toContainText("Reconectando");
    await api.post(`/api/admin/chat/conversations/${member.id}/messages`, { data: { body: "Depois da volta" } });
    await expect(guest.page.getByText("Depois da volta")).toBeVisible();
    await guest.context.close();
  });

  test("a message that fails to send can be retried without duplicates", async ({ browser }, info) => {
    const mobile = isMobile(info);
    const member = await newMember("Rita");
    const guest = await signedIn(browser, info, member.email, member.password);
    await guest.page.goto("/catalog");
    await guest.page.getByTestId("chat-launcher").click();
    await guest.page.route("**/api/chat/messages", (route) => (route.request().method() === "POST" ? route.abort() : route.continue()));
    await send(guest.page, "Vai falhar na primeira", mobile);
    await expect(guest.page.getByText("Não enviada.")).toBeVisible();
    await guest.page.unroute("**/api/chat/messages");
    await guest.page.getByRole("button", { name: "Tentar de novo" }).click();
    await expect(guest.page.getByText("Não enviada.")).toHaveCount(0);
    await expect(guest.page.getByText("Enviando...")).toHaveCount(0);
    await expect(guest.page.getByTestId("chat-message").filter({ hasText: "Vai falhar na primeira" })).toHaveCount(1);
    await expect
      .poll(async () => (await (await api.get(`/api/admin/chat/conversations/${member.id}`)).json()).messages.map((m: { body: string }) => m.body))
      .toEqual(["Vai falhar na primeira"]);

    if (!mobile) {
      await guest.page.locator("#chat-composer").fill("linha 1");
      await guest.page.locator("#chat-composer").press("Shift+Enter");
      await guest.page.locator("#chat-composer").pressSequentially("linha 2");
      await guest.page.locator("#chat-composer").press("Enter");
      await expect(guest.page.getByTestId("chat-message").filter({ hasText: "linha 2" })).toBeVisible();
      await expect
        .poll(async () => (await (await api.get(`/api/admin/chat/conversations/${member.id}`)).json()).messages.at(-1)?.body)
        .toBe("linha 1\nlinha 2");
    }
    await guest.context.close();
  });

  test("the house can start a conversation from the member file", async ({ browser }, info) => {
    const mobile = isMobile(info);
    const member = await newMember("Iara");
    const guest = await signedIn(browser, info, member.email, member.password);
    await guest.page.goto("/catalog");
    await expect(guest.page.getByTestId("chat-launcher")).toHaveAttribute("data-status", "open");

    const house = await signedIn(browser, info, ADMIN.email, ADMIN.password);
    await house.page.goto(`/admin/members/${member.id}`);
    await house.page.getByRole("link", { name: "Enviar mensagem" }).click();
    await expect(house.page).toHaveURL(new RegExp(`/admin/chat\\?member=${member.id}`));
    await expect(house.page.getByText("Nenhuma mensagem ainda")).toBeVisible();
    await send(house.page, "Olá Iara, a casa tem novidades.", mobile);
    await expect(guest.page.getByTestId("chat-unread")).toHaveText("1");
    await house.context.close();
    await guest.context.close();
  });

  test("a member disabled while online is signed out at once", async ({ browser }, info) => {
    const member = await newMember("Davi");
    const guest = await signedIn(browser, info, member.email, member.password);
    await guest.page.goto("/catalog");
    await expect(guest.page.getByTestId("chat-launcher")).toHaveAttribute("data-status", "open");
    expect((await api.post(`/api/admin/members/${member.id}/disable`)).status()).toBe(200);
    await expect(guest.page).toHaveURL(/\/$/, { timeout: 20_000 });
    await guest.context.close();
  });

  test("the history is still there after the member signs out and back in", async ({ browser }, info) => {
    const mobile = isMobile(info);
    const member = await newMember("Bruna");
    await api.post(`/api/admin/chat/conversations/${member.id}/messages`, { data: { body: "Mensagem da casa guardada" } });
    const guest = await signedIn(browser, info, member.email, member.password);
    const page = guest.page;
    await page.goto("/catalog");
    await page.getByTestId("chat-launcher").click();
    await send(page, "Minha mensagem guardada", mobile);
    await expect(page.getByText("Enviando...")).toHaveCount(0);
    await page.getByRole("button", { name: "Fechar conversa" }).click();

    if (mobile) await page.getByRole("button", { name: "Menu" }).click();
    else await page.locator("button[aria-haspopup=menu]").click();
    await page.getByRole(mobile ? "button" : "menuitem", { name: "Sair" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByTestId("chat-launcher")).toHaveCount(0);

    await page.locator("input[name=email]").fill(member.email);
    await page.locator("input[name=password]").fill(member.password);
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await expect(page).toHaveURL(/\/catalog/);
    await page.getByTestId("chat-launcher").click();
    await expect(page.getByTestId("chat-message").filter({ hasText: "Mensagem da casa guardada" })).toBeVisible();
    await expect(page.getByTestId("chat-message").filter({ hasText: "Minha mensagem guardada" })).toBeVisible();

    await page.reload();
    await page.getByTestId("chat-launcher").click();
    await expect(page.getByTestId("chat-message")).toHaveCount(2);
    await guest.context.close();
  });

  test("the house deletes a conversation and it disappears for both sides", async ({ browser }, info) => {
    const mobile = isMobile(info);
    const member = await newMember("Olga");
    const guest = await signedIn(browser, info, member.email, member.password);
    await guest.page.goto("/catalog");
    await guest.page.getByTestId("chat-launcher").click();
    await send(guest.page, "Por favor apaguem meus dados", mobile);
    await expect(guest.page.getByText("Enviando...")).toHaveCount(0);

    const house = await signedIn(browser, info, ADMIN.email, ADMIN.password);
    await house.page.goto(`/admin/chat?member=${member.id}`);
    await expect(house.page.getByTestId("chat-conversation").getByText("Por favor apaguem")).toBeVisible();
    house.page.once("dialog", (dialog) => void dialog.accept());
    await house.page.getByRole("button", { name: "Apagar conversa" }).click();
    await expect(house.page.getByTestId("toast").filter({ hasText: "Conversa apagada." })).toBeVisible();
    await expect(house.page).toHaveURL(/\/admin\/chat$/);
    await expect(house.page.locator(`[data-testid=conversation-row][data-member="${member.id}"]`)).toHaveCount(0);

    await expect(guest.page.getByTestId("chat-message")).toHaveCount(0);
    await expect(guest.page.getByText("Seja bem-vindo.")).toBeVisible();
    const history = await (await api.get(`/api/admin/chat/conversations/${member.id}`)).json();
    expect(history.messages).toEqual([]);

    await send(guest.page, "Recomeçando", mobile);
    await expect(house.page.locator(`[data-testid=conversation-row][data-member="${member.id}"]`)).toBeVisible();
    await house.context.close();
    await guest.context.close();
  });

  test("cancelling the confirmation keeps the conversation", async ({ browser }, info) => {
    const member = await newMember("Nina");
    await api.post(`/api/admin/chat/conversations/${member.id}/messages`, { data: { body: "Fica guardada" } });
    const house = await signedIn(browser, info, ADMIN.email, ADMIN.password);
    await house.page.goto(`/admin/chat?member=${member.id}`);
    await expect(house.page.getByTestId("chat-conversation").getByText("Fica guardada")).toBeVisible();
    house.page.once("dialog", (dialog) => void dialog.dismiss());
    await house.page.getByRole("button", { name: "Apagar conversa" }).click();
    await expect(house.page.getByTestId("chat-conversation").getByText("Fica guardada")).toBeVisible();
    const history = await (await api.get(`/api/admin/chat/conversations/${member.id}`)).json();
    expect(history.messages).toHaveLength(1);
    await house.context.close();
  });
});
