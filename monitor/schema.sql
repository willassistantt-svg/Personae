CREATE TABLE IF NOT EXISTS checks (
    ts INTEGER PRIMARY KEY,
    ok INTEGER NOT NULL,
    api_status INTEGER NOT NULL,
    site_status INTEGER NOT NULL,
    latency_ms INTEGER NOT NULL,
    error TEXT
);

CREATE TABLE IF NOT EXISTS incidents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at INTEGER NOT NULL,
    ended_at INTEGER,
    reason TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS state (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
