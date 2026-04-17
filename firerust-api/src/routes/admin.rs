use crate::{
    error::AppError,
    middleware::admin::AdminKey,
    models::project::{CreateProjectRequest, Project},
    state::AppState,
};
use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use std::sync::Arc;

/// POST /admin/projects
pub async fn create_project(
    State(state): State<Arc<AppState>>,
    _: AdminKey,
    Json(req): Json<CreateProjectRequest>,
) -> Result<(StatusCode, Json<Project>), AppError> {
    let project = Project::create(&state.db, req).await?;
    Ok((StatusCode::CREATED, Json(project)))
}

/// GET /admin/projects
pub async fn list_projects(
    State(state): State<Arc<AppState>>,
    _: AdminKey,
) -> Result<Json<Vec<Project>>, AppError> {
    Ok(Json(Project::list(&state.db).await?))
}

/// GET /admin/projects/:project_id
pub async fn get_project(
    State(state): State<Arc<AppState>>,
    _: AdminKey,
    Path(project_id): Path<String>,
) -> Result<Json<Project>, AppError> {
    Ok(Json(Project::get_by_id(&state.db, &project_id).await?))
}

/// DELETE /admin/projects/:project_id
pub async fn delete_project(
    State(state): State<Arc<AppState>>,
    _: AdminKey,
    Path(project_id): Path<String>,
) -> Result<StatusCode, AppError> {
    Project::delete(&state.db, &project_id).await?;
    Ok(StatusCode::NO_CONTENT)
}
