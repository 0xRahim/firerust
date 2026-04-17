use anyhow::Result;
use sqlx::{
    sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions},
    SqlitePool,
};
use std::str::FromStr;

pub async fn create_pool(db_path: &str) -> Result<SqlitePool> {
    // Make sure the parent directory exists for file-based databases
    if db_path != ":memory:" {
        if let Some(parent) = std::path::Path::new(db_path).parent() {
            if !parent.as_os_str().is_empty() {
                tokio::fs::create_dir_all(parent).await?;
            }
        }
    }

    let opts = SqliteConnectOptions::from_str(&format!("sqlite:{}", db_path))?
        .create_if_missing(true)
        .foreign_keys(true)
        .journal_mode(SqliteJournalMode::Wal);

    let pool = SqlitePoolOptions::new()
        .max_connections(10)
        .connect_with(opts)
        .await?;

    Ok(pool)
}

pub async fn run_migrations(pool: &SqlitePool) -> Result<()> {
    // Projects
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS projects (
            id          TEXT PRIMARY KEY,
            name        TEXT NOT NULL UNIQUE,
            description TEXT,
            created_at  TEXT NOT NULL
        );",
    )
    .execute(pool)
    .await?;

    // Auth users (one per project)
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS auth_users (
            id            TEXT PRIMARY KEY,
            project_id    TEXT NOT NULL,
            email         TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            metadata      TEXT NOT NULL DEFAULT '{}',
            created_at    TEXT NOT NULL,
            UNIQUE(project_id, email),
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        );",
    )
    .execute(pool)
    .await?;

    // File records
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS files (
            id            TEXT PRIMARY KEY,
            project_id    TEXT NOT NULL,
            user_id       TEXT,
            filename      TEXT NOT NULL,
            original_name TEXT NOT NULL,
            content_type  TEXT NOT NULL,
            size          INTEGER NOT NULL,
            path          TEXT NOT NULL,
            created_at    TEXT NOT NULL,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        );",
    )
    .execute(pool)
    .await?;

    // DB collections (stub — will hold schema + document data in future)
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS db_collections (
            id         TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            name       TEXT NOT NULL,
            schema     TEXT NOT NULL DEFAULT '{}',
            created_at TEXT NOT NULL,
            UNIQUE(project_id, name),
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        );",
    )
    .execute(pool)
    .await?;

    Ok(())
}

// ─── Unit tests ────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_in_memory_pool_and_migrations() {
        let pool = create_pool(":memory:").await.unwrap();
        run_migrations(&pool).await.unwrap();

        // Verify tables exist by querying them
        sqlx::query("SELECT id FROM projects LIMIT 1")
            .execute(&pool)
            .await
            .unwrap();
        sqlx::query("SELECT id FROM auth_users LIMIT 1")
            .execute(&pool)
            .await
            .unwrap();
        sqlx::query("SELECT id FROM files LIMIT 1")
            .execute(&pool)
            .await
            .unwrap();
        sqlx::query("SELECT id FROM db_collections LIMIT 1")
            .execute(&pool)
            .await
            .unwrap();
    }

    #[tokio::test]
    async fn test_foreign_key_cascade_delete() {
        let pool = create_pool(":memory:").await.unwrap();
        run_migrations(&pool).await.unwrap();

        // Insert a project then a user
        sqlx::query("INSERT INTO projects (id, name, created_at) VALUES ('p1','Test','2024-01-01')")
            .execute(&pool)
            .await
            .unwrap();
        sqlx::query(
            "INSERT INTO auth_users (id, project_id, email, password_hash, created_at)
             VALUES ('u1','p1','a@b.com','hash','2024-01-01')",
        )
        .execute(&pool)
        .await
        .unwrap();

        // Deleting the project should cascade to users
        sqlx::query("DELETE FROM projects WHERE id = 'p1'")
            .execute(&pool)
            .await
            .unwrap();

        let count: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM auth_users WHERE project_id = 'p1'")
                .fetch_one(&pool)
                .await
                .unwrap();
        assert_eq!(count, 0);
    }
}
