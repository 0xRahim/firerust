use crate::{
    error::AppError,
    middleware::{admin::AdminKey, jwt::JwtClaims},
    models::{
        auth_user::{AuthUser, AuthUserPublic, LoginRequest, LoginResponse, RegisterRequest},
        project::Project,
    },
    state::AppState,
};
use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use std::sync::Arc;

/// POST /api/:project_id/auth/register
pub async fn register(
    State(state): State<Arc<AppState>>,
    Path(project_id): Path<String>,
    Json(req): Json<RegisterRequest>,
) -> Result<(StatusCode, Json<AuthUserPublic>), AppError> {
    // Confirm project exists before attempting insert
    Project::get_by_id(&state.db, &project_id).await?;
    let user = AuthUser::create(&state.db, &project_id, req).await?;
    Ok((StatusCode::CREATED, Json(user.into())))
}

/// POST /api/:project_id/auth/login
pub async fn login(
    State(state): State<Arc<AppState>>,
    Path(project_id): Path<String>,
    Json(req): Json<LoginRequest>,
) -> Result<Json<LoginResponse>, AppError> {
    Ok(Json(
        AuthUser::login(
            &state.db,
            &project_id,
            req,
            &state.config.secret_key,
            state.config.jwt_expiry_hours,
        )
        .await?,
    ))
}

/// GET /api/:project_id/auth/me   — requires valid JWT for this project
pub async fn get_me(
    State(state): State<Arc<AppState>>,
    Path(project_id): Path<String>,
    JwtClaims(claims): JwtClaims,
) -> Result<Json<AuthUserPublic>, AppError> {
    if claims.project_id != project_id {
        return Err(AppError::Forbidden("Token is not valid for this project".into()));
    }
    Ok(Json(
        AuthUser::get_by_id(&state.db, &project_id, &claims.sub)
            .await?
            .into(),
    ))
}

/// GET /api/:project_id/auth/users   — admin only
pub async fn list_users(
    State(state): State<Arc<AppState>>,
    Path(project_id): Path<String>,
    _: AdminKey,
) -> Result<Json<Vec<AuthUserPublic>>, AppError> {
    let users = AuthUser::list(&state.db, &project_id).await?;
    Ok(Json(users.into_iter().map(Into::into).collect()))
}

/// DELETE /api/:project_id/auth/users/:user_id   — admin only
pub async fn delete_user(
    State(state): State<Arc<AppState>>,
    _: AdminKey,
    Path((project_id, user_id)): Path<(String, String)>,
) -> Result<StatusCode, AppError> {
    AuthUser::delete(&state.db, &project_id, &user_id).await?;
    Ok(StatusCode::NO_CONTENT)
}
