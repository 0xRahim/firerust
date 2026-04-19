//! Embedded static file server for the Next.js frontend.
//!
//! `rust-embed` bakes everything in `static/` into the binary at compile time
//! (or reads from disk in debug builds with the `debug-embed` feature).
//!
//! Lookup order for every request:
//!   1. Exact path              e.g.  `_next/static/abc.js`
//!   2. `<path>.html`           e.g.  `about.html`  for route `/about`
//!   3. `<path>/index.html`     e.g.  `auth/index.html`  for route `/auth`
//!   4. Root `index.html`       SPA fallback — lets the Next.js client router
//!                              take over for any deep-link URL
use axum::{
    body::Body,
    extract::Path,
    http::{header, StatusCode},
    response::Response,
};
use rust_embed::RustEmbed;

/// All files under `static/` are embedded here.
/// Populate this directory by running `make frontend` before `cargo build`.
#[derive(RustEmbed)]
#[folder = "static/"]
pub struct StaticAssets;

// ─── Axum handlers ────────────────────────────────────────────────────────────

/// Handles `GET /*path` — any path that didn't match an API route.
pub async fn static_handler(Path(path): Path<String>) -> Response {
    serve_path(&path)
}

/// Handles `GET /` — the root with no path segment.
pub async fn index_handler() -> Response {
    serve_path("index.html")
}

// ─── Core logic ───────────────────────────────────────────────────────────────

fn serve_path(raw: &str) -> Response {
    let path = raw.trim_start_matches('/');

    // 1. Exact match
    if let Some(file) = StaticAssets::get(path) {
        return build_response(path, file.data);
    }

    // 2. <path>.html  (Next.js emits `about.html` for the `/about` route
    //    when trailingSlash is false)
    let with_html = format!("{}.html", path);
    if let Some(file) = StaticAssets::get(&with_html) {
        return build_response(&with_html, file.data);
    }

    // 3. <path>/index.html  (trailingSlash:true emits these)
    let index = format!("{}/index.html", path);
    if let Some(file) = StaticAssets::get(&index) {
        return build_response(&index, file.data);
    }

    // 4. SPA fallback — return root index.html so the Next.js client router
    //    can render the correct page for this URL.
    if let Some(file) = StaticAssets::get("index.html") {
        return build_response("index.html", file.data);
    }

    // Nothing found and no index.html — static/ folder not populated yet.
    Response::builder()
        .status(StatusCode::SERVICE_UNAVAILABLE)
        .header(header::CONTENT_TYPE, "text/plain; charset=utf-8")
        .body(Body::from(
            "Frontend not built.\nRun `make build` from the firerust-api directory.",
        ))
        .unwrap()
}

fn build_response(path: &str, data: std::borrow::Cow<'static, [u8]>) -> Response {
    let mime = mime_guess::from_path(path)
        .first_or_octet_stream()
        .to_string();

    // HTML pages must not be cached so refreshes always get the latest shell.
    // Hashed JS/CSS chunks (Next.js content-hashed filenames) can be cached
    // for a full year.
    let cache = if mime.starts_with("text/html") {
        "no-cache, no-store, must-revalidate"
    } else {
        "public, max-age=31536000, immutable"
    };

    Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, mime)
        .header(header::CACHE_CONTROL, cache)
        .body(Body::from(data.into_owned()))
        .unwrap()
}