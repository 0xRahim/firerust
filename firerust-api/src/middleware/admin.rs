use crate::{error::AppError, state::AppState};
use async_trait::async_trait;
use axum::{
    extract::{FromRef, FromRequestParts},
    http::request::Parts,
};
use std::sync::Arc;

/// Zero-cost extractor that guards a handler behind the admin key.
///
/// Add `_: AdminKey` as a handler parameter to require the
/// `X-Admin-Key` header to match `config.admin_key`.
pub struct AdminKey;

#[async_trait]
impl<S> FromRequestParts<S> for AdminKey
where
    S: Send + Sync,
    Arc<AppState>: FromRef<S>,
{
    type Rejection = AppError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let app_state = Arc::<AppState>::from_ref(state);

        let key = parts
            .headers
            .get("x-admin-key")
            .and_then(|v| v.to_str().ok())
            .ok_or_else(|| AppError::Unauthorized("Missing X-Admin-Key header".into()))?;

        if key != app_state.config.admin_key {
            return Err(AppError::Forbidden("Invalid admin key".into()));
        }

        Ok(AdminKey)
    }
}