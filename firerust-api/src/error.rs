use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Not found: {0}")]
    NotFound(String),
    #[error("Unauthorized: {0}")]
    Unauthorized(String),
    #[error("Forbidden: {0}")]
    Forbidden(String),
    #[error("Bad request: {0}")]
    BadRequest(String),
    #[error("Conflict: {0}")]
    Conflict(String),
    #[error("Internal error: {0}")]
    Internal(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match &self {
            AppError::NotFound(m) => (StatusCode::NOT_FOUND, m.clone()),
            AppError::Unauthorized(m) => (StatusCode::UNAUTHORIZED, m.clone()),
            AppError::Forbidden(m) => (StatusCode::FORBIDDEN, m.clone()),
            AppError::BadRequest(m) => (StatusCode::BAD_REQUEST, m.clone()),
            AppError::Conflict(m) => (StatusCode::CONFLICT, m.clone()),
            AppError::Internal(m) => (StatusCode::INTERNAL_SERVER_ERROR, m.clone()),
        };
        (status, Json(json!({ "error": message }))).into_response()
    }
}

impl From<sqlx::Error> for AppError {
    fn from(e: sqlx::Error) -> Self {
        match e {
            sqlx::Error::RowNotFound => AppError::NotFound("Resource not found".into()),
            _ => AppError::Internal(e.to_string()),
        }
    }
}

impl From<std::io::Error> for AppError {
    fn from(e: std::io::Error) -> Self {
        AppError::Internal(e.to_string())
    }
}

impl From<bcrypt::BcryptError> for AppError {
    fn from(e: bcrypt::BcryptError) -> Self {
        AppError::Internal(e.to_string())
    }
}

impl From<jsonwebtoken::errors::Error> for AppError {
    fn from(e: jsonwebtoken::errors::Error) -> Self {
        AppError::Unauthorized(format!("JWT error: {}", e))
    }
}

// ─── Unit tests ────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::StatusCode;

    fn status_of(e: AppError) -> StatusCode {
        let resp = e.into_response();
        resp.status()
    }

    #[test]
    fn test_not_found_status() {
        assert_eq!(status_of(AppError::NotFound("x".into())), StatusCode::NOT_FOUND);
    }
    #[test]
    fn test_unauthorized_status() {
        assert_eq!(status_of(AppError::Unauthorized("x".into())), StatusCode::UNAUTHORIZED);
    }
    #[test]
    fn test_forbidden_status() {
        assert_eq!(status_of(AppError::Forbidden("x".into())), StatusCode::FORBIDDEN);
    }
    #[test]
    fn test_bad_request_status() {
        assert_eq!(status_of(AppError::BadRequest("x".into())), StatusCode::BAD_REQUEST);
    }
    #[test]
    fn test_conflict_status() {
        assert_eq!(status_of(AppError::Conflict("x".into())), StatusCode::CONFLICT);
    }
    #[test]
    fn test_internal_status() {
        assert_eq!(status_of(AppError::Internal("x".into())), StatusCode::INTERNAL_SERVER_ERROR);
    }
    #[test]
    fn test_sqlx_row_not_found_maps_to_not_found() {
        let e: AppError = sqlx::Error::RowNotFound.into();
        assert!(matches!(e, AppError::NotFound(_)));
    }
}
