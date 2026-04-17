pub mod config;
pub mod db;
pub mod error;
pub mod middleware;
pub mod models;
pub mod routes;
pub mod state;

use axum::{
    routing::{delete, get, post},
    Router,
};
use crate::state::AppState;
use tower_http::{cors::CorsLayer, trace::TraceLayer};

pub fn build_router(state: std::sync::Arc<AppState>) -> Router {
    let admin_routes = Router::new()
        .route("/projects", get(routes::admin::list_projects))
        .route("/projects", post(routes::admin::create_project))
        .route("/projects/:project_id", get(routes::admin::get_project))
        .route("/projects/:project_id", delete(routes::admin::delete_project));

    let auth_routes = Router::new()
        .route("/register", post(routes::auth::register))
        .route("/login", post(routes::auth::login))
        .route("/me", get(routes::auth::get_me))
        .route("/users", get(routes::auth::list_users))
        .route("/users/:user_id", delete(routes::auth::delete_user));

    let file_routes = Router::new()
        .route("/upload", post(routes::files::upload_file))
        .route("/", get(routes::files::list_files))
        .route("/:file_id", get(routes::files::get_file_meta))
        .route("/:file_id/download", get(routes::files::download_file))
        .route("/:file_id", delete(routes::files::delete_file));

    let db_routes = Router::new()
        .route("/collections", get(routes::db_model::list_collections))
        .route("/collections", post(routes::db_model::create_collection))
        .route("/collections/:coll_id/documents", get(routes::db_model::list_documents))
        .route("/collections/:coll_id/documents", post(routes::db_model::create_document));

    let health = Router::new().route(
        "/health",
        get(|| async { axum::Json(serde_json::json!({ "status": "ok" })) }),
    );

    Router::new()
        .merge(health)
        .nest("/admin", admin_routes)
        .nest("/api/:project_id/auth", auth_routes)
        .nest("/api/:project_id/files", file_routes)
        .nest("/api/:project_id/db", db_routes)
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}
