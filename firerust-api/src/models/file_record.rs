use crate::error::AppError;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct FileRecord {
    pub id: String,
    pub project_id: String,
    pub user_id: Option<String>,
    /// Stored filename on disk (UUID + extension)
    pub filename: String,
    /// Original filename from the upload
    pub original_name: String,
    pub content_type: String,
    /// File size in bytes
    pub size: i64,
    /// Absolute path to the file on disk
    pub path: String,
    pub created_at: String,
}

impl FileRecord {
    /// Insert a new file record. `id` and `filename` are pre-computed by the
    /// upload handler so the caller controls the on-disk layout.
    #[allow(clippy::too_many_arguments)]
    pub async fn insert(
        pool: &SqlitePool,
        id: &str,
        project_id: &str,
        user_id: Option<&str>,
        filename: &str,
        original_name: &str,
        content_type: &str,
        size: i64,
        path: &str,
    ) -> Result<Self, AppError> {
        let now = Utc::now().to_rfc3339();

        sqlx::query(
            "INSERT INTO files
             (id, project_id, user_id, filename, original_name, content_type, size, path, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(id)
        .bind(project_id)
        .bind(user_id)
        .bind(filename)
        .bind(original_name)
        .bind(content_type)
        .bind(size)
        .bind(path)
        .bind(&now)
        .execute(pool)
        .await?;

        Ok(FileRecord {
            id: id.to_string(),
            project_id: project_id.to_string(),
            user_id: user_id.map(str::to_string),
            filename: filename.to_string(),
            original_name: original_name.to_string(),
            content_type: content_type.to_string(),
            size,
            path: path.to_string(),
            created_at: now,
        })
    }

    pub async fn list(pool: &SqlitePool, project_id: &str) -> Result<Vec<Self>, AppError> {
        Ok(sqlx::query_as::<_, FileRecord>(
            "SELECT id, project_id, user_id, filename, original_name,
                    content_type, size, path, created_at
             FROM files WHERE project_id = ? ORDER BY created_at DESC",
        )
        .bind(project_id)
        .fetch_all(pool)
        .await?)
    }

    pub async fn get_by_id(
        pool: &SqlitePool,
        project_id: &str,
        file_id: &str,
    ) -> Result<Self, AppError> {
        sqlx::query_as::<_, FileRecord>(
            "SELECT id, project_id, user_id, filename, original_name,
                    content_type, size, path, created_at
             FROM files WHERE id = ? AND project_id = ?",
        )
        .bind(file_id)
        .bind(project_id)
        .fetch_optional(pool)
        .await?
        .ok_or_else(|| AppError::NotFound("File not found".into()))
    }

    /// Deletes the DB row and returns the on-disk path so the caller can
    /// remove the actual file.
    pub async fn delete(
        pool: &SqlitePool,
        project_id: &str,
        file_id: &str,
    ) -> Result<String, AppError> {
        let file = Self::get_by_id(pool, project_id, file_id).await?;
        sqlx::query("DELETE FROM files WHERE id = ? AND project_id = ?")
            .bind(file_id)
            .bind(project_id)
            .execute(pool)
            .await?;
        Ok(file.path)
    }
}

// ─── Unit tests ────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db;
    use uuid::Uuid;

    async fn pool_with_project() -> (SqlitePool, String) {
        let p = db::create_pool(":memory:").await.unwrap();
        db::run_migrations(&p).await.unwrap();
        let pid = Uuid::new_v4().to_string();
        sqlx::query(
            "INSERT INTO projects (id, name, created_at) VALUES (?, 'P', '2024-01-01')",
        )
        .bind(&pid)
        .execute(&p)
        .await
        .unwrap();
        (p, pid)
    }

    async fn insert_dummy(pool: &SqlitePool, project_id: &str) -> FileRecord {
        let id = Uuid::new_v4().to_string();
        FileRecord::insert(
            pool,
            &id,
            project_id,
            Some("user1"),
            &format!("{}.txt", id),
            "hello.txt",
            "text/plain",
            42,
            "/tmp/hello.txt",
        )
        .await
        .unwrap()
    }

    #[tokio::test]
    async fn test_insert_and_get() {
        let (p, proj) = pool_with_project().await;
        let rec = insert_dummy(&p, &proj).await;
        let fetched = FileRecord::get_by_id(&p, &proj, &rec.id).await.unwrap();
        assert_eq!(fetched.original_name, "hello.txt");
        assert_eq!(fetched.size, 42);
    }

    #[tokio::test]
    async fn test_list() {
        let (p, proj) = pool_with_project().await;
        insert_dummy(&p, &proj).await;
        insert_dummy(&p, &proj).await;
        let list = FileRecord::list(&p, &proj).await.unwrap();
        assert_eq!(list.len(), 2);
    }

    #[tokio::test]
    async fn test_delete() {
        let (p, proj) = pool_with_project().await;
        let rec = insert_dummy(&p, &proj).await;
        FileRecord::delete(&p, &proj, &rec.id).await.unwrap();
        let err = FileRecord::get_by_id(&p, &proj, &rec.id).await.unwrap_err();
        assert!(matches!(err, AppError::NotFound(_)));
    }

    #[tokio::test]
    async fn test_get_nonexistent_errors() {
        let (p, proj) = pool_with_project().await;
        let err = FileRecord::get_by_id(&p, &proj, "nope").await.unwrap_err();
        assert!(matches!(err, AppError::NotFound(_)));
    }
}
