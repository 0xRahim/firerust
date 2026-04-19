pub mod config;
pub mod db;
pub mod error;
pub mod middleware;
pub mod models;
pub mod routes;
pub mod state;
pub mod web;

use axum::{
    routing::{delete, get, post},
    Router,
};
use crate::state::AppState;
use tower_http::{cors::CorsLayer, trace::TraceLayer};

pub fn build_router(state: std::sync::Arc<AppState>) -> Router {
    // ── API routes ─────────────────────────────────────────────────────────
    // These are registered first so they always win over the frontend wildcard.

    let admin_routes = Router::new()
        .route("/projects",           get(routes::admin::list_projects))
        .route("/projects",           post(routes::admin::create_project))
        .route("/projects/:id",       get(routes::admin::get_project))
        .route("/projects/:id",       delete(routes::admin::delete_project));

    let auth_routes = Router::new()
        .route("/register",           post(routes::auth::register))
        .route("/login",              post(routes::auth::login))
        .route("/me",                 get(routes::auth::get_me))
        .route("/users",              get(routes::auth::list_users))
        .route("/users/:user_id",     delete(routes::auth::delete_user));

    let file_routes = Router::new()
        .route("/upload",             post(routes::files::upload_file))
        .route("/",                   get(routes::files::list_files))
        .route("/:file_id",           get(routes::files::get_file_meta))
        .route("/:file_id/download",  get(routes::files::download_file))
        .route("/:file_id",           delete(routes::files::delete_file));

    let db_routes = Router::new()
        .route("/collections",
            get(routes::db_model::list_collections)
            .post(routes::db_model::create_collection))
        .route("/collections/:coll_id/documents",
            get(routes::db_model::list_documents)
            .post(routes::db_model::create_document));

    // ── Frontend (lowest priority) ─────────────────────────────────────────
    // `/*path` matches everything that didn't match an API route above.
    // `web::static_handler` tries the exact asset first, then falls back to
    // returning index.html so the Next.js client router can take over.
    let frontend = Router::new()
        .route("/",      get(web::index_handler))
        .route("/*path", get(web::static_handler));

    Router::new()
        // healthcheck
        .route("/health", get(|| async {
            axum::Json(serde_json::json!({ "status": "ok" }))
        }))
        // API namespaces
        .nest("/admin",                      admin_routes)
        .nest("/api/:project_id/auth",       auth_routes)
        .nest("/api/:project_id/files",      file_routes)
        .nest("/api/:project_id/db",         db_routes)
        // Frontend catch-all — must be last
        .merge(frontend)
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}