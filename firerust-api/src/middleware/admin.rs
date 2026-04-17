use crate::{error::AppError, state::AppState};
use axum::{
    extract::{FromRef, FromRequestParts},
    http::request::Parts,
};
use std::{future::Future, sync::Arc};

/// Zero-cost extractor that guards a handler behind the admin key.
///
/// Add `_: AdminKey` (or `AdminKey` if you want the value) as a parameter on
/// any handler to require the `X-Admin-Key` header to match `config.admin_key`.
pub struct AdminKey;

impl<S> FromRequestParts<S> for AdminKey
where
    S: Send + Sync,
    Arc<AppState>: FromRef<S>,
{
    type Rejection = AppError;

    // Use `fn -> impl Future` rather than `async fn` to avoid E0195 —
    // a rustc lifetime-elision quirk that fires when the impl's where-clause
    // contains complex bounds (e.g. Arc<T>: FromRef<S>) alongside async fn.
    fn from_request_parts(
        parts: &mut Parts,
        state: &S,
    ) -> impl Future<Output = Result<Self, Self::Rejection>> + Send + '_ {
        // Extract what we need synchronously so nothing borrows `parts`
        // across the async boundary.
        let key = parts
            .headers
            .get("x-admin-key")
            .and_then(|v| v.to_str().ok())
            .map(str::to_owned);

        let app_state = Arc::<AppState>::from_ref(state);

        async move {
            let key = key
                .ok_or_else(|| AppError::Unauthorized("Missing X-Admin-Key header".into()))?;

            if key != app_state.config.admin_key {
                return Err(AppError::Forbidden("Invalid admin key".into()));
            }

            Ok(AdminKey)
        }
    }
}
