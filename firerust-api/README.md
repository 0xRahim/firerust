# 🔥 Firerust

A lightweight, self-hosted Backend-as-a-Service inspired by Firebase and Supabase.
Built with **Rust + Axum + SQLite**. Zero external services required.

---

## Features

| Module | Status | Description |
|---|---|---|
| **Admin** | ✅ | Create / list / delete projects via `X-Admin-Key` |
| **Auth** | ✅ | Per-project JWT auth — register, login, `/me` |
| **Files** | ✅ | S3-style multipart upload, list, download, delete |
| **DB** | 🚧 | Collection scaffolding ready; document CRUD coming soon |

---

## Requirements

- Rust **≥ 1.80** (`rustup update stable`)
- SQLite shared lib (`libsqlite3-dev` on Ubuntu)

---

## Quick Start

```bash
# 1. Clone / enter the directory
cd firerust

# 2. Edit config (at minimum change the keys)
cp config.json config.local.json
$EDITOR config.local.json

# 3. Build and run
cargo run --release -- config.local.json
```

The server starts on `http://0.0.0.0:3000` by default.

---

## Configuration — `config.json`

```json
{
  "db_path":         "./data/firerust.db",
  "secret_key":      "change-this-secret-key-in-production-min-32-chars",
  "admin_key":       "change-this-admin-key-in-production",
  "uploads_folder":  "./uploads",
  "jwt_expiry_hours": 24,
  "host":            "0.0.0.0",
  "port":            3000
}
```

| Field | Description |
|---|---|
| `db_path` | Path to SQLite file. Use `:memory:` for tests. |
| `secret_key` | HMAC-SHA256 secret used to sign JWTs. Min 32 chars. |
| `admin_key` | Value that must be sent in `X-Admin-Key` header for admin routes. |
| `uploads_folder` | Root directory for uploaded files. Project sub-folders are created automatically. |
| `jwt_expiry_hours` | How long issued tokens remain valid. Default: `24`. |
| `host` / `port` | Bind address. Default: `0.0.0.0:3000`. |

---

## Running Tests

```bash
# Unit tests (no network, in-memory DB)
cargo test

# With log output
RUST_LOG=debug cargo test -- --nocapture
```

---

## Project Layout

```
firerust/
├── config.json            # Default config
├── Cargo.toml
└── src/
    ├── main.rs            # Router assembly + server startup
    ├── config.rs          # Config loading + validation
    ├── db.rs              # Pool creation + schema migrations
    ├── error.rs           # Unified AppError → HTTP response
    ├── state.rs           # Shared AppState (pool + config)
    ├── middleware/
    │   ├── admin.rs       # X-Admin-Key extractor
    │   └── jwt.rs         # Bearer JWT extractor
    ├── models/
    │   ├── project.rs     # Project CRUD
    │   ├── auth_user.rs   # User CRUD + JWT generation/validation
    │   └── file_record.rs # File metadata CRUD
    └── routes/
        ├── admin.rs       # Admin project endpoints
        ├── auth.rs        # Auth endpoints
        ├── files.rs       # File upload/download endpoints
        └── db_model.rs    # DB collection endpoints (stub)
```
