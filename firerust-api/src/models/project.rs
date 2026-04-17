use crate::error::AppError;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateProjectRequest {
    pub name: String,
    pub description: Option<String>,
}

impl Project {
    pub async fn create(pool: &SqlitePool, req: CreateProjectRequest) -> Result<Self, AppError> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();

        sqlx::query(
            "INSERT INTO projects (id, name, description, created_at) VALUES (?, ?, ?, ?)",
        )
        .bind(&id)
        .bind(&req.name)
        .bind(&req.description)
        .bind(&now)
        .execute(pool)
        .await
        .map_err(|e| {
            if let sqlx::Error::Database(ref db_err) = e {
                if db_err.is_unique_violation() {
                    return AppError::Conflict(format!(
                        "Project '{}' already exists",
                        req.name
                    ));
                }
            }
            AppError::from(e)
        })?;

        Ok(Project {
            id,
            name: req.name,
            description: req.description,
            created_at: now,
        })
    }

    pub async fn list(pool: &SqlitePool) -> Result<Vec<Self>, AppError> {
        Ok(sqlx::query_as::<_, Project>(
            "SELECT id, name, description, created_at FROM projects ORDER BY created_at DESC",
        )
        .fetch_all(pool)
        .await?)
    }

    pub async fn get_by_id(pool: &SqlitePool, id: &str) -> Result<Self, AppError> {
        sqlx::query_as::<_, Project>(
            "SELECT id, name, description, created_at FROM projects WHERE id = ?",
        )
        .bind(id)
        .fetch_optional(pool)
        .await?
        .ok_or_else(|| AppError::NotFound(format!("Project '{}' not found", id)))
    }

    pub async fn delete(pool: &SqlitePool, id: &str) -> Result<(), AppError> {
        let affected = sqlx::query("DELETE FROM projects WHERE id = ?")
            .bind(id)
            .execute(pool)
            .await?
            .rows_affected();

        if affected == 0 {
            Err(AppError::NotFound(format!("Project '{}' not found", id)))
        } else {
            Ok(())
        }
    }
}

// ─── Unit tests ────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db;

    async fn pool() -> SqlitePool {
        let p = db::create_pool(":memory:").await.unwrap();
        db::run_migrations(&p).await.unwrap();
        p
    }

    fn req(name: &str) -> CreateProjectRequest {
        CreateProjectRequest {
            name: name.to_string(),
            description: Some("desc".into()),
        }
    }

    #[tokio::test]
    async fn test_create_and_get() {
        let p = pool().await;
        let proj = Project::create(&p, req("alpha")).await.unwrap();
        assert_eq!(proj.name, "alpha");

        let fetched = Project::get_by_id(&p, &proj.id).await.unwrap();
        assert_eq!(fetched.id, proj.id);
    }

    #[tokio::test]
    async fn test_create_duplicate_name_conflicts() {
        let p = pool().await;
        Project::create(&p, req("beta")).await.unwrap();
        let err = Project::create(&p, req("beta")).await.unwrap_err();
        assert!(matches!(err, AppError::Conflict(_)));
    }

    #[tokio::test]
    async fn test_list_returns_all() {
        let p = pool().await;
        Project::create(&p, req("a")).await.unwrap();
        Project::create(&p, req("b")).await.unwrap();
        let list = Project::list(&p).await.unwrap();
        assert_eq!(list.len(), 2);
    }

    #[tokio::test]
    async fn test_delete_existing() {
        let p = pool().await;
        let proj = Project::create(&p, req("del")).await.unwrap();
        Project::delete(&p, &proj.id).await.unwrap();
        let err = Project::get_by_id(&p, &proj.id).await.unwrap_err();
        assert!(matches!(err, AppError::NotFound(_)));
    }

    #[tokio::test]
    async fn test_delete_nonexistent_errors() {
        let p = pool().await;
        let err = Project::delete(&p, "no-such-id").await.unwrap_err();
        assert!(matches!(err, AppError::NotFound(_)));
    }

    #[tokio::test]
    async fn test_get_nonexistent_errors() {
        let p = pool().await;
        let err = Project::get_by_id(&p, "ghost").await.unwrap_err();
        assert!(matches!(err, AppError::NotFound(_)));
    }
}
