CREATE TABLE IF NOT EXISTS students (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  salt          TEXT NOT NULL,
  display_name  TEXT NOT NULL,
  university    TEXT,
  major         TEXT,
  city          TEXT,
  longitude     REAL,
  latitude      REAL,
  status_text   TEXT DEFAULT '',
  can_cengfan   INTEGER DEFAULT 1,
  is_admin      INTEGER DEFAULT 0,
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT OR IGNORE INTO settings VALUES ('colorMode',    'unified');
INSERT OR IGNORE INTO settings VALUES ('unifiedColor', '#b8ff47');
INSERT OR IGNORE INTO settings VALUES ('originName',   'SHENZHEN_LONGGANG');
INSERT OR IGNORE INTO settings VALUES ('originLon',    '114.247');
INSERT OR IGNORE INTO settings VALUES ('originLat',    '22.723');

CREATE TABLE IF NOT EXISTS banned_words (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  word TEXT UNIQUE NOT NULL
);
