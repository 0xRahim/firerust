use crate::{
    error::AppError,
    models::auth_user::{validate_jwt, Claims},
    state::AppState,
};
use async_trait::async_trait;
use axum::{
    extract::{FromRef, FromRequestParts},
    http::{header, request::Parts},
};
use std::sync::Arc;

/// Extractor that validates a `Bearer` token and exposes the JWT `Claims`.
///
/// Usage in a handler: `JwtClaims(claims): JwtClaims`
pub struct JwtClaims(pub Claims);

#[async_trait]
impl<S> FromRequestParts<S> for JwtClaims
where
    S: Send + Sync,
    Arc<AppState>: FromRef<S>,
{
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let app_state = Arc::<AppState>::from_ref(state);

        let auth = parts
            .headers
            .get(header::AUTHORIZATION)
            .and_then(|v| v.to_str().ok())
            .ok_or_else(|| AppError::Unauthorized("Missing Authorization header".into()))?;

        let token = auth
            .strip_prefix("Bearer ")
            .ok_or_else(|| {
                AppError::Unauthorized("Authorization header must be 'Bearer <token>'".into())
            })?;

        let claims = validate_jwt(token, &app_state.config.secret_key)?;
        Ok(JwtClaims(claims))
    }
}