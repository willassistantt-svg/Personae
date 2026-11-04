const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const RETENTION = 90 * DAY;

export default {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(runCheck(env));
  },

  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/status") {
      return Response.json(await summary(env), { headers: { "cache-control": "no-store" } });
    }
    if (url.pathname === "/" || url.pathname === "/index.html") {
      return new Response(page(await summary(env)), {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
          "x-robots-tag": "noindex, nofollow",
        },
      });
    }
    return new Response("Not found", { status: 404 });
  },
};

async function probe(url, validate) {
  const started = Date.now();
  try {
    const response = await fetch(url, {
      headers: { "user-agent": "personae-monitor/1.0", "cache-control": "no-cache" },
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
      cf: { cacheTtl: 0, cacheEverything: false },
    });
    const body = await response.text();
    const ok = response.status === 200 && (!validate || validate(body));
    return { ok, status: response.status, ms: Date.now() - started, error: ok ? null : `HTTP ${response.status} em ${new URL(url).pathname}` };
  } catch (error) {
    return { ok: false, status: 0, ms: Date.now() - started, error: `${new URL(url).pathname}: ${error.name === "TimeoutError" ? "sem resposta em 15s" : error.message}` };
  }
}

async function runCheck(env) {
  const now = Date.now();
  const [api, site] = await Promise.all([
    probe(`${env.TARGET}/api/health`, (body) => body.includes('"database":"UP"')),
    probe(`${env.TARGET}/`),
  ]);
  const ok = api.ok && site.ok;
  const error = [api.error, site.error].filter(Boolean).join(" · ") || null;

  await env.DB.prepare("INSERT OR REPLACE INTO checks (ts, ok, api_status, site_status, latency_ms, error) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(now, ok ? 1 : 0, api.status, site.status, Math.max(api.ms, site.ms), error)
    .run();

  const state = await readState(env);
  const threshold = Number(env.FAILURES_BEFORE_ALERT || 2);
  if (ok) {
    if (state.status === "down") {
      const incident = await env.DB.prepare("SELECT id, started_at FROM incidents WHERE ended_at IS NULL ORDER BY id DESC LIMIT 1").first();
      if (incident) {
        await env.DB.prepare("UPDATE incidents SET ended_at = ? WHERE id = ?").bind(now, incident.id).run();
      }
      await alert(env, "✅ personae.men voltou", `O site voltou a responder${incident ? ` depois de ${duration(now - incident.started_at)} fora do ar` : ""}.`);
    }
    await writeState(env, { status: "up", streak: 0, since: state.status === "up" ? state.since : now });
  } else {
    const streak = state.streak + 1;
    if (streak >= threshold && state.status !== "down") {
      await env.DB.prepare("INSERT INTO incidents (started_at, reason) VALUES (?, ?)").bind(now - (streak - 1) * MINUTE, error || "falha").run();
      await alert(env, "🔴 personae.men fora do ar", `Falhou ${streak} verificações seguidas.\n\nMotivo: ${error}\n\nO painel fica em https://status.personae.men`);
      await writeState(env, { status: "down", streak, since: now });
    } else {
      await writeState(env, { ...state, streak });
    }
  }

  if (new Date(now).getUTCMinutes() === 0) {
    await env.DB.prepare("DELETE FROM checks WHERE ts < ?").bind(now - RETENTION).run();
  }
}

async function readState(env) {
  const row = await env.DB.prepare("SELECT value FROM state WHERE key = 'monitor'").first();
  return row ? JSON.parse(row.value) : { status: "unknown", streak: 0, since: Date.now() };
}

async function writeState(env, value) {
  await env.DB.prepare("INSERT OR REPLACE INTO state (key, value) VALUES ('monitor', ?)").bind(JSON.stringify(value)).run();
}

async function alert(env, subject, text) {
  if (!env.RESEND_API_KEY || !env.ALERT_TO) return;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: env.ALERT_FROM,
      to: env.ALERT_TO.split(",").map((value) => value.trim()).filter(Boolean),
      subject,
      text: `${text}\n\n${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} (horário de Brasília)`,
    }),
  });
  if (!response.ok) console.log("alert failed", response.status, await response.text());
}

async function summary(env) {
  const now = Date.now();
  const state = await readState(env);
  const last = await env.DB.prepare("SELECT * FROM checks ORDER BY ts DESC LIMIT 1").first();
  const uptime = async (window) => {
    const row = await env.DB.prepare("SELECT COUNT(*) AS total, SUM(ok) AS up, AVG(latency_ms) AS latency FROM checks WHERE ts >= ?").bind(now - window).first();
    return { total: row.total, percent: row.total ? (100 * row.up) / row.total : null, latency: row.latency ? Math.round(row.latency) : null };
  };
  const bucket = 15 * MINUTE;
  const { results: buckets } = await env.DB.prepare(
    "SELECT (ts / ?) * ? AS slot, COUNT(*) AS total, SUM(ok) AS up, AVG(latency_ms) AS latency FROM checks WHERE ts >= ? GROUP BY slot ORDER BY slot"
  ).bind(bucket, bucket, now - DAY).all();
  const { results: days } = await env.DB.prepare(
    "SELECT (ts / ?) * ? AS slot, COUNT(*) AS total, SUM(ok) AS up FROM checks WHERE ts >= ? GROUP BY slot ORDER BY slot"
  ).bind(DAY, DAY, now - 30 * DAY).all();
  const { results: incidents } = await env.DB.prepare("SELECT * FROM incidents ORDER BY started_at DESC LIMIT 15").all();
  return {
    target: env.TARGET,
    status: state.status,
    since: state.since,
    last,
    uptime: { day: await uptime(DAY), week: await uptime(7 * DAY), month: await uptime(30 * DAY) },
    buckets,
    days,
    incidents,
    generatedAt: now,
  };
}

function duration(ms) {
  const minutes = Math.max(1, Math.round(ms / MINUTE));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours} h ${minutes % 60} min`;
  return `${Math.floor(hours / 24)} dias`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function page(data) {
  const fmt = (ts) => new Date(ts).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });
  const pct = (u) => (u.percent === null ? "—" : `${u.percent.toFixed(u.percent === 100 ? 0 : 2)}%`);
  const status = data.status === "down" ? "down" : data.last ? (data.last.ok ? "up" : "degraded") : "unknown";
  const label = { up: "No ar", down: "Fora do ar", degraded: "Instável", unknown: "Aguardando a primeira verificação" }[status];

  const now = data.generatedAt;
  const bucket = 15 * MINUTE;
  const bySlot = new Map(data.buckets.map((b) => [b.slot, b]));
  const firstSlot = Math.floor((now - DAY) / bucket) * bucket;
  const bars = [];
  for (let slot = firstSlot, i = 0; slot <= now; slot += bucket, i++) {
    const b = bySlot.get(slot);
    const color = !b ? "#2a2a2a" : b.up === b.total ? "#10b981" : b.up === 0 ? "#fb7185" : "#f59e0b";
    const title = b ? `${fmt(slot)} · ${b.up}/${b.total} ok · ${Math.round(b.latency)} ms` : `${fmt(slot)} · sem dados`;
    bars.push(`<rect x="${i * 7}" y="0" width="5" height="34" rx="1.5" fill="${color}"><title>${escapeHtml(title)}</title></rect>`);
  }

  const points = data.buckets.filter((b) => b.latency !== null);
  const maxLatency = Math.max(500, ...points.map((b) => b.latency));
  const line = points
    .map((b) => `${(((b.slot - firstSlot) / DAY) * 672).toFixed(1)},${(90 - (b.latency / maxLatency) * 84).toFixed(1)}`)
    .join(" ");

  const dayCells = data.days
    .map((d) => {
      const p = (100 * d.up) / d.total;
      const color = p === 100 ? "#10b981" : p >= 99 ? "#84cc16" : p >= 95 ? "#f59e0b" : "#fb7185";
      return `<div class="day" style="background:${color}" title="${escapeHtml(new Date(d.slot).toLocaleDateString("pt-BR", { timeZone: "UTC" }))} · ${p.toFixed(2)}%"></div>`;
    })
    .join("");

  const incidents = data.incidents.length
    ? data.incidents
        .map(
          (i) => `<li><span class="dot ${i.ended_at ? "ok" : "bad"}"></span><div><strong>${fmt(i.started_at)}</strong> · ${
            i.ended_at ? `durou ${duration(i.ended_at - i.started_at)}` : "em andamento"
          }<br><small>${escapeHtml(i.reason)}</small></div></li>`
        )
        .join("")
    : "<li><small>Nenhuma queda registrada.</small></li>";

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="refresh" content="60"><meta name="robots" content="noindex,nofollow">
<title>${label} · Personae status</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#0a0a0a;color:#f4f4f5;font:15px/1.5 system-ui,-apple-system,Segoe UI,sans-serif}
main{max-width:760px;margin:0 auto;padding:40px 20px}h1{font:italic 32px Georgia,serif;margin:0 0 4px}h2{font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#71717a;margin:0 0 14px}
.muted{color:#71717a}.card{background:#121212;border:1px solid #262626;border-radius:20px;padding:22px;margin-top:18px}
.hero{display:flex;align-items:center;gap:16px}.pulse{width:16px;height:16px;border-radius:50%;flex:none}
.up .pulse{background:#10b981;box-shadow:0 0 0 6px #10b98122}.down .pulse{background:#fb7185;box-shadow:0 0 0 6px #fb718522}.degraded .pulse{background:#f59e0b;box-shadow:0 0 0 6px #f59e0b22}.unknown .pulse{background:#71717a}
.state{font-size:22px;font-weight:600}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.stat{background:#1a1a1a;border-radius:14px;padding:14px}
.stat b{display:block;font-size:22px}.stat small{color:#71717a}svg{width:100%;height:auto;display:block}
.days{display:grid;grid-template-columns:repeat(30,1fr);gap:3px}.day{height:26px;border-radius:3px}
ul{list-style:none;margin:0;padding:0}li{display:flex;gap:12px;padding:10px 0;border-top:1px solid #1f1f1f}li:first-child{border-top:0}
.dot{width:10px;height:10px;border-radius:50%;margin-top:7px;flex:none}.dot.ok{background:#10b981}.dot.bad{background:#fb7185}
a{color:#d4af37}footer{margin-top:24px;font-size:12px;color:#71717a}@media(max-width:560px){.grid{grid-template-columns:1fr}}
</style></head><body><main>
<h1>Personae</h1><p class="muted">Monitoramento de <a href="${escapeHtml(data.target)}">${escapeHtml(data.target.replace("https://", ""))}</a> a cada minuto: API, banco de dados e página inicial.</p>
<div class="card ${status}"><div class="hero"><span class="pulse"></span><div><div class="state">${label}</div>
<div class="muted">${data.last ? `Última verificação ${fmt(data.last.ts)} · ${data.last.latency_ms} ms${data.last.error ? ` · ${escapeHtml(data.last.error)}` : ""}` : ""}${
    data.status !== "unknown" ? `<br>Neste estado desde ${fmt(data.since)}` : ""
  }</div></div></div></div>
<div class="card"><h2>Disponibilidade</h2><div class="grid">
<div class="stat"><b>${pct(data.uptime.day)}</b><small>24 horas · ${data.uptime.day.latency ?? "—"} ms médio</small></div>
<div class="stat"><b>${pct(data.uptime.week)}</b><small>7 dias · ${data.uptime.week.latency ?? "—"} ms médio</small></div>
<div class="stat"><b>${pct(data.uptime.month)}</b><small>30 dias · ${data.uptime.month.latency ?? "—"} ms médio</small></div>
</div></div>
<div class="card"><h2>Últimas 24 horas (blocos de 15 min)</h2><svg viewBox="0 0 ${bars.length * 7} 34" preserveAspectRatio="none">${bars.join("")}</svg>
<h2 style="margin-top:22px">Tempo de resposta (máx. ${Math.round(maxLatency)} ms)</h2>
<svg viewBox="0 0 672 96"><line x1="0" y1="90" x2="672" y2="90" stroke="#262626"/>${
    line ? `<polyline points="${line}" fill="none" stroke="#d4af37" stroke-width="2" stroke-linejoin="round"/>` : ""
  }</svg></div>
<div class="card"><h2>Últimos 30 dias</h2><div class="days">${dayCells || '<small class="muted">Sem dados ainda.</small>'}</div></div>
<div class="card"><h2>Quedas</h2><ul>${incidents}</ul></div>
<footer>Atualiza sozinho a cada minuto · <a href="/api/status">JSON</a> · alertas por e-mail quando o site cai e quando volta</footer>
</main></body></html>`;
}
