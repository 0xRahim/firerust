use crate::{
    error::AppError,
    models::auth_user::{validate_jwt, Claims},
    state::AppState,
};
use axum::{
    extract::{FromRef, FromRequestParts},
    http::{header, request::Parts},
};
use std::{future::Future, sync::Arc};

/// Extractor that validates a `Bearer` token and exposes the JWT `Claims`.
///
/// Usage in a handler: `JwtClaims(claims): JwtClaims`
pub struct JwtClaims(pub Claims);

impl<S> FromRequestParts<S> for JwtClaims
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
        // Pull the header value out synchronously and convert to an owned
        // String so nothing borrows `parts` across the async boundary.
        let auth_header = parts
            .headers
            .get(header::AUTHORIZATION)
            .and_then(|v| v.to_str().ok())
            .map(str::to_owned);

        let app_state = Arc::<AppState>::from_ref(state);

        async move {
            let auth = auth_header
                .ok_or_else(|| AppError::Unauthorized("Missing Authorization header".into()))?;

            // Convert to owned so we don't hold a borrow of `auth` inside
            // the future (avoids a self-referential borrow).
            let token = auth
                .strip_prefix("Bearer ")
                .map(str::to_owned)
                .ok_or_else(|| {
                    AppError::Unauthorized(
                        "Authorization header must be 'Bearer <token>'".into(),
                    )
                })?;

            let claims = validate_jwt(&token, &app_state.config.secret_key)?;
            Ok(JwtClaims(claims))
        }
    }
}
