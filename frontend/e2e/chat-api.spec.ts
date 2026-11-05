import { expect, request as playwrightRequest, test, type APIRequestContext } from "@playwright/test";
import { ADMIN, createMember, login, type Account } from "./helpers";

test.describe("chat API: access, validation and isolation", () => {
  let admin: APIRequestContext;
  let alice: Account;
  let bruno: Account;
  const baseURL = process.env.E2E_BASE_URL ?? "http://localhost";

  test.beforeAll(async () => {
    admin = await playwrightRequest.newContext({ baseURL });
    await login(admin, ADMIN.email, ADMIN.password);
    alice = await createMember(admin, "Alice");
    bruno = await createMember(admin, "Bruno");
  });

  test.afterAll(async () => {
    for (const member of [alice, bruno]) {
      if (member) await admin.delete(`/api/admin/members/${member.id}`);
    }
    await admin.dispose();
  });

  async function as(account: Account) {
    const context = await playwrightRequest.newContext({ baseURL });
    await login(context, account.email, account.password);
    return context;
  }

  test("visitors without a session are refused, including the socket handshake", async () => {
    const anonymous = await playwrightRequest.newContext({ baseURL });
    expect((await anonymous.get("/api/chat/messages")).status()).toBe(401);
    expect((await anonymous.post("/api/chat/messages", { data: { body: "oi" } })).status()).toBe(401);
    expect((await anonymous.get("/api/admin/chat/conversations")).status()).toBe(401);
    const handshake = await anonymous.get("/api/chat/socket", {
      headers: { Connection: "Upgrade", Upgrade: "websocket", "Sec-WebSocket-Version": "13", "Sec-WebSocket-Key": "dGhlIHNhbXBsZSBub25jZQ==" },
    });
    expect(handshake.status()).toBe(401);
    await anonymous.dispose();
  });

  test("members cannot reach the house inbox and the house cannot use the member endpoints", async () => {
    const member = await as(alice);
    expect((await member.get("/api/admin/chat/conversations")).status()).toBe(403);
    expect((await member.post(`/api/admin/chat/conversations/${bruno.id}/messages`, { data: { body: "intruso" } })).status()).toBe(403);
    expect((await admin.get("/api/chat/messages")).status()).toBe(403);
    expect((await admin.post("/api/chat/messages", { data: { body: "oi" } })).status()).toBe(403);
    await member.dispose();
  });

  test("rejects empty, oversized and malformed messages", async () => {
    const member = await as(alice);
    const empty = await member.post("/api/chat/messages", { data: { body: "   \n  " } });
    expect(empty.status()).toBe(400);
    expect((await empty.json()).code).toBe("CHAT_EMPTY");
    const long = await member.post("/api/chat/messages", { data: { body: "x".repeat(2001) } });
    expect(long.status()).toBe(400);
    expect((await long.json()).code).toBe("CHAT_TOO_LONG");
    expect((await member.post("/api/chat/messages", { data: "not json", headers: { "Content-Type": "application/json" } })).status()).toBe(400);
    expect((await admin.get("/api/admin/chat/conversations/not-a-uuid")).status()).toBe(400);
    expect((await admin.get("/api/admin/chat/conversations/00000000-0000-0000-0000-000000000000")).status()).toBe(404);
    const exact = await member.post("/api/chat/messages", { data: { body: "y".repeat(2000) } });
    expect(exact.status()).toBe(200);
    await member.dispose();
  });

  test("each member only sees their own conversation; the house sees both", async () => {
    const a = await as(alice);
    const b = await as(bruno);
    const sent = await a.post("/api/chat/messages", { data: { body: "Mensagem privada da Alice", clientId: "abc" } });
    expect(sent.status()).toBe(200);
    const view = await sent.json();
    expect(view).toMatchObject({ body: "Mensagem privada da Alice", fromHouse: false, clientId: "abc" });

    const brunoHistory = await (await b.get("/api/chat/messages")).json();
    expect(JSON.stringify(brunoHistory)).not.toContain("Alice");

    const list = (await (await admin.get("/api/admin/chat/conversations")).json()) as { member: { id: string }; unread: number }[];
    const row = list.find((item) => item.member.id === alice.id);
    expect(row?.unread).toBeGreaterThanOrEqual(1);
    expect(list.find((item) => item.member.id === bruno.id)).toBeUndefined();

    const reply = await admin.post(`/api/admin/chat/conversations/${alice.id}/messages`, { data: { body: "Resposta da casa" } });
    expect(reply.status()).toBe(200);
    expect(await reply.json()).toMatchObject({ fromHouse: true, senderName: "Marina" });
    const aliceView = (await (await a.get("/api/chat/messages")).json()) as { messages: { body: string; senderName: string | null }[] };
    const houseMessage = aliceView.messages.find((message) => message.body === "Resposta da casa");
    expect(houseMessage, "member receives the reply").toBeTruthy();
    expect(houseMessage?.senderName, "members see the house, not the admin's name").toBeNull();
    expect((await (await b.get("/api/chat/messages")).json()).messages).toHaveLength(0);
    await a.dispose();
    await b.dispose();
  });

  test("unread counts follow reads on both sides", async () => {
    const a = await as(alice);
    await a.post("/api/chat/read");
    expect((await (await a.get("/api/chat/status")).json()).unread).toBe(0);
    await admin.post(`/api/admin/chat/conversations/${alice.id}/messages`, { data: { body: "Mais uma" } });
    expect((await (await a.get("/api/chat/status")).json()).unread).toBe(1);
    await a.post("/api/chat/read");
    expect((await (await a.get("/api/chat/status")).json()).unread).toBe(0);

    await a.post("/api/chat/messages", { data: { body: "Lido?" } });
    const before = (await (await admin.get("/api/admin/chat/unread")).json()).unread;
    expect(before).toBeGreaterThanOrEqual(1);
    expect((await admin.post(`/api/admin/chat/conversations/${alice.id}/read`)).status()).toBe(204);
    const list = (await (await admin.get("/api/admin/chat/conversations")).json()) as { member: { id: string }; unread: number }[];
    expect(list.find((item) => item.member.id === alice.id)?.unread).toBe(0);
    await a.dispose();
  });

  test("pages through history without gaps or repeats", async () => {
    const b = await as(bruno);
    for (let i = 1; i <= 7; i++) {
      expect((await b.post("/api/chat/messages", { data: { body: `pagina ${i}` } })).status()).toBe(200);
    }
    const first = await (await b.get("/api/chat/messages?limit=3")).json();
    expect(first.hasMore).toBe(true);
    expect(first.messages.map((m: { body: string }) => m.body)).toEqual(["pagina 5", "pagina 6", "pagina 7"]);
    const second = await (await b.get(`/api/chat/messages?limit=3&before=${encodeURIComponent(first.messages[0].createdAt)}`)).json();
    expect(second.messages.map((m: { body: string }) => m.body)).toEqual(["pagina 2", "pagina 3", "pagina 4"]);
    const third = await (await b.get(`/api/chat/messages?limit=3&before=${encodeURIComponent(second.messages[0].createdAt)}`)).json();
    expect(third.messages.map((m: { body: string }) => m.body)).toEqual(["pagina 1"]);
    expect(third.hasMore).toBe(false);
    await b.dispose();
  });

  test("slows down floods of messages", async () => {
    const flooder = await createMember(admin, "Rapido");
    const context = await as(flooder);
    const codes: number[] = [];
    for (let i = 0; i < 22; i++) codes.push((await context.post("/api/chat/messages", { data: { body: `spam ${i}` } })).status());
    expect(codes.filter((code) => code === 200)).toHaveLength(20);
    expect(codes.slice(20)).toEqual([429, 429]);
    await context.dispose();
    await admin.delete(`/api/admin/members/${flooder.id}`);
  });

  test("a disabled member loses access and cannot be messaged until enabled again", async () => {
    const member = await createMember(admin, "Pausado");
    const context = await as(member);
    expect((await context.post("/api/chat/messages", { data: { body: "antes" } })).status()).toBe(200);
    expect((await admin.post(`/api/admin/members/${member.id}/disable`)).status()).toBe(200);
    expect((await context.get("/api/chat/messages")).status()).toBe(401);
    const blocked = await admin.post(`/api/admin/chat/conversations/${member.id}/messages`, { data: { body: "oi" } });
    expect(blocked.status()).toBe(409);
    const thread = await (await admin.get(`/api/admin/chat/conversations/${member.id}`)).json();
    expect(thread.member.active).toBe(false);
    expect(thread.messages.map((m: { body: string }) => m.body)).toEqual(["antes"]);
    expect((await admin.post(`/api/admin/members/${member.id}/enable`)).status()).toBe(200);
    expect((await admin.post(`/api/admin/chat/conversations/${member.id}/messages`, { data: { body: "de volta" } })).status()).toBe(200);
    await context.dispose();
    await admin.delete(`/api/admin/members/${member.id}`);
  });

  test("removing a member removes their conversation", async () => {
    const member = await createMember(admin, "Saindo");
    const context = await as(member);
    await context.post("/api/chat/messages", { data: { body: "tchau" } });
    expect((await admin.delete(`/api/admin/members/${member.id}`)).status()).toBe(204);
    const list = (await (await admin.get("/api/admin/chat/conversations")).json()) as { member: { id: string } }[];
    expect(list.find((item) => item.member.id === member.id)).toBeUndefined();
    expect((await admin.get(`/api/admin/chat/conversations/${member.id}`)).status()).toBe(404);
    await context.dispose();
  });

  test("the house can erase a conversation; members cannot", async () => {
    const member = await createMember(admin, "Apagar");
    const context = await as(member);
    for (const body of ["um", "dois"]) await context.post("/api/chat/messages", { data: { body } });
    await admin.post(`/api/admin/chat/conversations/${member.id}/messages`, { data: { body: "três" } });

    expect((await context.delete(`/api/admin/chat/conversations/${member.id}`)).status()).toBe(403);
    expect((await admin.delete("/api/admin/chat/conversations/00000000-0000-0000-0000-000000000000")).status()).toBe(404);

    expect((await admin.delete(`/api/admin/chat/conversations/${member.id}`)).status()).toBe(204);
    expect((await (await admin.get(`/api/admin/chat/conversations/${member.id}`)).json()).messages).toEqual([]);
    expect((await (await context.get("/api/chat/messages")).json()).messages).toEqual([]);
    expect((await (await context.get("/api/chat/status")).json()).unread).toBe(0);
    const list = (await (await admin.get("/api/admin/chat/conversations")).json()) as { member: { id: string } }[];
    expect(list.find((item) => item.member.id === member.id)).toBeUndefined();
    expect((await admin.delete(`/api/admin/chat/conversations/${member.id}`)).status()).toBe(204);

    const activity = await (await admin.get("/api/admin/activity")).text();
    expect(activity).toContain("CHAT_DELETED");

    expect((await context.post("/api/chat/messages", { data: { body: "de novo" } })).status()).toBe(200);
    expect((await (await admin.get(`/api/admin/chat/conversations/${member.id}`)).json()).messages).toHaveLength(1);
    await context.dispose();
    await admin.delete(`/api/admin/members/${member.id}`);
  });
});
