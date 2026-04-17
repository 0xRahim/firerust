use crate::{
    error::AppError,
    middleware::jwt::JwtClaims,
    models::file_record::FileRecord,
    state::AppState,
};
use axum::{
    body::Body,
    extract::{Multipart, Path, State},
    http::{header, StatusCode},
    response::Response,
    Json,
};
use std::{path::PathBuf, sync::Arc};
use tokio::fs;
use uuid::Uuid;

/// POST /api/:project_id/files/upload
///
/// Expects a `multipart/form-data` body with a field named `file`.
pub async fn upload_file(
    State(state): State<Arc<AppState>>,
    Path(project_id): Path<String>,
    JwtClaims(claims): JwtClaims,
    mut multipart: Multipart,
) -> Result<(StatusCode, Json<FileRecord>), AppError> {
    if claims.project_id != project_id {
        return Err(AppError::Forbidden("Token is not valid for this project".into()));
    }

    // Ensure the project-specific upload directory exists
    let project_dir = PathBuf::from(&state.config.uploads_folder).join(&project_id);
    fs::create_dir_all(&project_dir).await?;

    let mut record: Option<FileRecord> = None;

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| AppError::BadRequest(e.to_string()))?
    {
        if field.name().unwrap_or("") != "file" {
            continue;
        }

        let original_name = field.file_name().unwrap_or("unknown").to_string();
        let content_type = field
            .content_type()
            .unwrap_or("application/octet-stream")
            .to_string();
        let data = field
            .bytes()
            .await
            .map_err(|e| AppError::BadRequest(e.to_string()))?;
        let size = data.len() as i64;

        // Build a unique stored filename
        let file_id = Uuid::new_v4().to_string();
        let ext = std::path::Path::new(&original_name)
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("");
        let stored_name = if ext.is_empty() {
            file_id.clone()
        } else {
            format!("{}.{}", file_id, ext)
        };

        let disk_path = project_dir.join(&stored_name);
        fs::write(&disk_path, &data).await?;

        record = Some(
            FileRecord::insert(
                &state.db,
                &file_id,
                &project_id,
                Some(&claims.sub),
                &stored_name,
                &original_name,
                &content_type,
                size,
                disk_path.to_str().unwrap_or(""),
            )
            .await?,
        );
        break; // only first file field is processed
    }

    let rec = record
        .ok_or_else(|| AppError::BadRequest("No 'file' field found in multipart body".into()))?;
    Ok((StatusCode::CREATED, Json(rec)))
}

/// GET /api/:project_id/files
pub async fn list_files(
    State(state): State<Arc<AppState>>,
    Path(project_id): Path<String>,
    JwtClaims(claims): JwtClaims,
) -> Result<Json<Vec<FileRecord>>, AppError> {
    if claims.project_id != project_id {
        return Err(AppError::Forbidden("Token is not valid for this project".into()));
    }
    Ok(Json(FileRecord::list(&state.db, &project_id).await?))
}

/// GET /api/:project_id/files/:file_id
pub async fn get_file_meta(
    State(state): State<Arc<AppState>>,
    Path((project_id, file_id)): Path<(String, String)>,
    JwtClaims(claims): JwtClaims,
) -> Result<Json<FileRecord>, AppError> {
    if claims.project_id != project_id {
        return Err(AppError::Forbidden("Token is not valid for this project".into()));
    }
    Ok(Json(FileRecord::get_by_id(&state.db, &project_id, &file_id).await?))
}

/// GET /api/:project_id/files/:file_id/download
///
/// Public — no JWT required. Returns the raw file bytes with correct headers.
pub async fn download_file(
    State(state): State<Arc<AppState>>,
    Path((project_id, file_id)): Path<(String, String)>,
) -> Result<Response, AppError> {
    let file = FileRecord::get_by_id(&state.db, &project_id, &file_id).await?;

    let data = fs::read(&file.path)
        .await
        .map_err(|_| AppError::NotFound("File data not found on disk".into()))?;

    let response = Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, &file.content_type)
        .header(
            header::CONTENT_DISPOSITION,
            format!("attachment; filename=\"{}\"", file.original_name),
        )
        .header(header::CONTENT_LENGTH, file.size.to_string())
        .body(Body::from(data))
        .map_err(|e| AppError::Internal(e.to_string()))?;

    Ok(response)
}

/// DELETE /api/:project_id/files/:file_id
///
/// Only the uploader may delete their own file.
pub async fn delete_file(
    State(state): State<Arc<AppState>>,
    Path((project_id, file_id)): Path<(String, String)>,
    JwtClaims(claims): JwtClaims,
) -> Result<StatusCode, AppError> {
    if claims.project_id != project_id {
        return Err(AppError::Forbidden("Token is not valid for this project".into()));
    }

    let file = FileRecord::get_by_id(&state.db, &project_id, &file_id).await?;

    if file.user_id.as_deref() != Some(&claims.sub) {
        return Err(AppError::Forbidden("You can only delete files you uploaded".into()));
    }

    let path = FileRecord::delete(&state.db, &project_id, &file_id).await?;
    // Best-effort disk removal — ignore errors if file was already gone
    let _ = fs::remove_file(&path).await;

    Ok(StatusCode::NO_CONTENT)
}
