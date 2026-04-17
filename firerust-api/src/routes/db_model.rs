/// DB Model — Collection management (stub)
///
/// Document CRUD is not yet implemented. These endpoints let you create and
/// list collections now; full query support is planned for a future release.
use crate::{
    error::AppError,
    middleware::jwt::JwtClaims,
    state::AppState,
};
use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use uuid::Uuid;

// ─── Types ─────────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct Collection {
    pub id: String,
    pub project_id: String,
    pub name: String,
    pub schema: String,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateCollectionRequest {
    pub name: String,
    /// Optional JSON schema for documents in this collection
    pub schema: Option<serde_json::Value>,
}

// ─── Handlers ──────────────────────────────────────────────────────────────────

/// GET /api/:project_id/db/collections
pub async fn list_collections(
    State(state): State<Arc<AppState>>,
    Path(project_id): Path<String>,
    JwtClaims(claims): JwtClaims,
) -> Result<Json<serde_json::Value>, AppError> {
    if claims.project_id != project_id {
        return Err(AppError::Forbidden("Token is not valid for this project".into()));
    }

    let collections = sqlx::query_as::<_, Collection>(
        "SELECT id, project_id, name, schema, created_at
         FROM db_collections WHERE project_id = ? ORDER BY created_at",
    )
    .bind(&project_id)
    .fetch_all(&state.db)
    .await?;

    let items: Vec<serde_json::Value> = collections
        .iter()
        .map(|c| {
            serde_json::json!({
                "id":         c.id,
                "name":       c.name,
                "schema":     serde_json::from_str::<serde_json::Value>(&c.schema)
                                  .unwrap_or(serde_json::json!({})),
                "created_at": c.created_at,
            })
        })
        .collect();

    Ok(Json(serde_json::json!({
        "collections": items,
        "note": "Document CRUD coming soon."
    })))
}

/// POST /api/:project_id/db/collections
pub async fn create_collection(
    State(state): State<Arc<AppState>>,
    Path(project_id): Path<String>,
    JwtClaims(claims): JwtClaims,
    Json(req): Json<CreateCollectionRequest>,
) -> Result<(StatusCode, Json<serde_json::Value>), AppError> {
    if claims.project_id != project_id {
        return Err(AppError::Forbidden("Token is not valid for this project".into()));
    }

    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let schema_str = req
        .schema
        .as_ref()
        .map(|s| s.to_string())
        .unwrap_or_else(|| "{}".to_string());

    sqlx::query(
        "INSERT INTO db_collections (id, project_id, name, schema, created_at)
         VALUES (?, ?, ?, ?, ?)",
    )
    .bind(&id)
    .bind(&project_id)
    .bind(&req.name)
    .bind(&schema_str)
    .bind(&now)
    .execute(&state.db)
    .await
    .map_err(|e| {
        if let sqlx::Error::Database(ref db_err) = e {
            if db_err.is_unique_violation() {
                return AppError::Conflict(format!(
                    "Collection '{}' already exists in this project",
                    req.name
                ));
            }
        }
        AppError::from(e)
    })?;

    Ok((
        StatusCode::CREATED,
        Json(serde_json::json!({
            "id":         id,
            "project_id": project_id,
            "name":       req.name,
            "schema":     req.schema,
            "created_at": now,
            "note":       "Document CRUD coming soon."
        })),
    ))
}

/// GET /api/:project_id/db/collections/:coll_id/documents  (stub)
pub async fn list_documents(
    Path((project_id, collection_id)): Path<(String, String)>,
    JwtClaims(claims): JwtClaims,
) -> Result<Json<serde_json::Value>, AppError> {
    if claims.project_id != project_id {
        return Err(AppError::Forbidden("Token is not valid for this project".into()));
    }
    Ok(Json(serde_json::json!({
        "collection_id": collection_id,
        "documents": [],
        "note": "Document CRUD not yet implemented."
    })))
}

/// POST /api/:project_id/db/collections/:coll_id/documents  (stub)
pub async fn create_document(
    Path((project_id, collection_id)): Path<(String, String)>,
    JwtClaims(claims): JwtClaims,
    Json(_body): Json<serde_json::Value>,
) -> Result<(StatusCode, Json<serde_json::Value>), AppError> {
    if claims.project_id != project_id {
        return Err(AppError::Forbidden("Token is not valid for this project".into()));
    }
    Ok((
        StatusCode::NOT_IMPLEMENTED,
        Json(serde_json::json!({
            "collection_id": collection_id,
            "note": "Document CRUD not yet implemented."
        })),
    ))
}
