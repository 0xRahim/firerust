# ─────────────────────────────────────────────────────────────────────────────
# Firerust — Makefile
#
# Repo layout expected:
#   <workspace>/
#   ├── firerust-api/    ← Rust project (this Makefile lives here)
#   │   ├── static/      ← populated by `make frontend`
#   │   └── src/
#   └── firerust-web/    ← Next.js project (sibling directory)
#
# Quick start:
#   cd firerust-api
#   make build                   # build everything
#   ./target/release/firerust    # run (serves dashboard on :3000)
#
# Prerequisites:
#   Node.js ≥ 18 + npm
#   Rust ≥ 1.80  (rustup update stable)
#   libsqlite3-dev  (sudo apt install libsqlite3-dev)
# ─────────────────────────────────────────────────────────────────────────────

SHELL        := /bin/bash
FRONTEND_DIR := ../firerust-web
STATIC_DIR   := ./static
BINARY       := ./target/release/firerust

.PHONY: all build frontend backend dev clean help

all: build

# ── Full build ────────────────────────────────────────────────────────────────

build: frontend backend
	@printf "\n\033[32m┌─────────────────────────────────────────────┐\033[0m\n"
	@printf "\033[32m│  ✅  Single binary ready                      │\033[0m\n"
	@printf "\033[32m│                                               │\033[0m\n"
	@printf "\033[32m│  Run :  ./target/release/firerust config.json │\033[0m\n"
	@printf "\033[32m│  Open:  http://localhost:3000                 │\033[0m\n"
	@printf "\033[32m└─────────────────────────────────────────────┘\033[0m\n\n"

# ── Frontend ──────────────────────────────────────────────────────────────────

frontend:
	@echo "──────────────────────────────────────────"
	@echo " [1/3] npm install"
	@echo "──────────────────────────────────────────"
	cd "$(FRONTEND_DIR)" && npm install --prefer-offline

	@echo "──────────────────────────────────────────"
	@echo " [2/3] next build  (static export)"
	@echo "──────────────────────────────────────────"
	cd "$(FRONTEND_DIR)" && npm run build

	@# Sanity-check: next.config.ts must have output:"export" or out/ won't exist
	@test -d "$(FRONTEND_DIR)/out" || { \
	  echo ""; \
	  echo "ERROR: $(FRONTEND_DIR)/out not found."; \
	  echo "Make sure next.config.ts contains:  output: \"export\""; \
	  exit 1; \
	}

	@echo "──────────────────────────────────────────"
	@echo " [3/3] Copy out/ → static/"
	@echo "──────────────────────────────────────────"
	rm -rf "$(STATIC_DIR)"
	cp -r "$(FRONTEND_DIR)/out" "$(STATIC_DIR)"
	@FILE_COUNT=$$(find "$(STATIC_DIR)" -type f | wc -l | tr -d ' '); \
	 echo " ✓  $$FILE_COUNT files embedded in static/"

# ── Backend ───────────────────────────────────────────────────────────────────

backend:
	@echo "──────────────────────────────────────────"
	@echo " Building Rust binary (release)"
	@echo "──────────────────────────────────────────"
	cargo build --release
	@SIZE=$$(du -sh "$(BINARY)" | cut -f1); \
	 echo " ✓  $(BINARY)  ($$SIZE)"

# ── Dev (no frontend rebuild) ─────────────────────────────────────────────────

dev:
	@echo " Starting dev server — http://localhost:3000"
	@echo " (frontend served from embedded static/ directory)"
	RUST_LOG=firerust=debug,tower_http=debug cargo run -- config.json

# ── Clean ─────────────────────────────────────────────────────────────────────

clean:
	rm -rf "$(FRONTEND_DIR)/.next" "$(FRONTEND_DIR)/out"
	rm -rf "$(STATIC_DIR)"
	mkdir -p "$(STATIC_DIR)"
	@printf "# Run 'make frontend' to populate this directory\n" \
	  > "$(STATIC_DIR)/.gitkeep"
	cargo clean
	@echo "✓  Clean complete"

# ── Help ──────────────────────────────────────────────────────────────────────

help:
	@echo ""
	@echo "  make build      Full release build (Next.js + Rust binary)"
	@echo "  make frontend   Next.js static export  →  static/"
	@echo "  make backend    Rust release binary only"
	@echo "  make dev        cargo run in debug mode"
	@echo "  make clean      Remove all build artifacts"
	@echo ""