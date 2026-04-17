use crate::error::AppError;
use chrono::Utc;
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use uuid::Uuid;

// ─── Domain structs ────────────────────────────────────────────────────────────

#[derive(Debug, Clone, sqlx::FromRow)]
pub struct AuthUser {
    pub id: String,
    pub project_id: String,
    pub email: String,
    pub password_hash: String,
    pub metadata: String,
    pub created_at: String,
}

/// Public-facing user object (no password hash)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthUserPublic {
    pub id: String,
    pub project_id: String,
    pub email: String,
    pub metadata: serde_json::Value,
    pub created_at: String,
}

impl From<AuthUser> for AuthUserPublic {
    fn from(u: AuthUser) -> Self {
        let metadata = serde_json::from_str(&u.metadata).unwrap_or(serde_json::json!({}));
        AuthUserPublic {
            id: u.id,
            project_id: u.project_id,
            email: u.email,
            metadata,
            created_at: u.created_at,
        }
    }
}

// ─── Request / Response types ──────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct RegisterRequest {
    pub email: String,
    pub password: String,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    /// user id
    pub sub: String,
    pub email: String,
    pub project_id: String,
    /// expiry (Unix seconds)
    pub exp: usize,
    /// issued-at (Unix seconds)
    pub iat: usize,
}

#[derive(Debug, Serialize)]
pub struct LoginResponse {
    pub token: String,
    pub user: AuthUserPublic,
}

// ─── Model methods ─────────────────────────────────────────────────────────────

impl AuthUser {
    pub async fn create(
        pool: &SqlitePool,
        project_id: &str,
        req: RegisterRequest,
    ) -> Result<Self, AppError> {
        // Verify the project exists
        let exists: bool =
            sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM projects WHERE id = ?)")
                .bind(project_id)
                .fetch_one(pool)
                .await?;
        if !exists {
            return Err(AppError::NotFound(format!(
                "Project '{}' not found",
                project_id
            )));
        }

        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();
        let metadata_str = req
            .metadata
            .as_ref()
            .map(|m| m.to_string())
            .unwrap_or_else(|| "{}".to_string());

        // Hash in a blocking thread so we don't stall the async runtime
        let password = req.password.clone();
        let password_hash = tokio::task::spawn_blocking(move || {
            bcrypt::hash(password, bcrypt::DEFAULT_COST)
        })
        .await
        .map_err(|e| AppError::Internal(e.to_string()))??;

        sqlx::query(
            "INSERT INTO auth_users (id, project_id, email, password_hash, metadata, created_at)
             VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind(&id)
        .bind(project_id)
        .bind(&req.email)
        .bind(&password_hash)
        .bind(&metadata_str)
        .bind(&now)
        .execute(pool)
        .await
        .map_err(|e| {
            if let sqlx::Error::Database(ref db_err) = e {
                if db_err.is_unique_violation() {
                    return AppError::Conflict(format!(
                        "Email '{}' already registered in this project",
                        req.email
                    ));
                }
            }
            AppError::from(e)
        })?;

        Ok(AuthUser {
            id,
            project_id: project_id.to_string(),
            email: req.email,
            password_hash,
            metadata: metadata_str,
            created_at: now,
        })
    }

    pub async fn login(
        pool: &SqlitePool,
        project_id: &str,
        req: LoginRequest,
        secret_key: &str,
        expiry_hours: u64,
    ) -> Result<LoginResponse, AppError> {
        let user = sqlx::query_as::<_, AuthUser>(
            "SELECT id, project_id, email, password_hash, metadata, created_at
             FROM auth_users WHERE project_id = ? AND email = ?",
        )
        .bind(project_id)
        .bind(&req.email)
        .fetch_optional(pool)
        .await?
        .ok_or_else(|| AppError::Unauthorized("Invalid email or password".into()))?;

        let hash = user.password_hash.clone();
        let password = req.password.clone();
        let valid = tokio::task::spawn_blocking(move || bcrypt::verify(password, &hash))
            .await
            .map_err(|e| AppError::Internal(e.to_string()))??;

        if !valid {
            return Err(AppError::Unauthorized("Invalid email or password".into()));
        }

        let token = generate_jwt(&user, secret_key, expiry_hours)?;
        Ok(LoginResponse {
            token,
            user: user.into(),
        })
    }

    pub async fn get_by_id(
        pool: &SqlitePool,
        project_id: &str,
        user_id: &str,
    ) -> Result<Self, AppError> {
        sqlx::query_as::<_, AuthUser>(
            "SELECT id, project_id, email, password_hash, metadata, created_at
             FROM auth_users WHERE id = ? AND project_id = ?",
        )
        .bind(user_id)
        .bind(project_id)
        .fetch_optional(pool)
        .await?
        .ok_or_else(|| AppError::NotFound("User not found".into()))
    }

    pub async fn list(pool: &SqlitePool, project_id: &str) -> Result<Vec<Self>, AppError> {
        Ok(sqlx::query_as::<_, AuthUser>(
            "SELECT id, project_id, email, password_hash, metadata, created_at
             FROM auth_users WHERE project_id = ? ORDER BY created_at DESC",
        )
        .bind(project_id)
        .fetch_all(pool)
        .await?)
    }

    pub async fn delete(
        pool: &SqlitePool,
        project_id: &str,
        user_id: &str,
    ) -> Result<(), AppError> {
        let affected = sqlx::query("DELETE FROM auth_users WHERE id = ? AND project_id = ?")
            .bind(user_id)
            .bind(project_id)
            .execute(pool)
            .await?
            .rows_affected();

        if affected == 0 {
            Err(AppError::NotFound("User not found".into()))
        } else {
            Ok(())
        }
    }
}

// ─── JWT helpers ───────────────────────────────────────────────────────────────

pub fn generate_jwt(user: &AuthUser, secret: &str, expiry_hours: u64) -> Result<String, AppError> {
    let now = Utc::now();
    let exp = (now + chrono::Duration::hours(expiry_hours as i64)).timestamp() as usize;
    let claims = Claims {
        sub: user.id.clone(),
        email: user.email.clone(),
        project_id: user.project_id.clone(),
        exp,
        iat: now.timestamp() as usize,
    };
    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(AppError::from)
}

pub fn validate_jwt(token: &str, secret: &str) -> Result<Claims, AppError> {
    let data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &Validation::default(),
    )
    .map_err(|e| AppError::Unauthorized(format!("Invalid token: {}", e)))?;
    Ok(data.claims)
}

// ─── Unit tests ────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db;

    const SECRET: &str = "test-secret-key-long-enough-for-hmac";

    async fn pool_with_project() -> (SqlitePool, String) {
        let p = db::create_pool(":memory:").await.unwrap();
        db::run_migrations(&p).await.unwrap();
        let proj_id = Uuid::new_v4().to_string();
        sqlx::query(
            "INSERT INTO projects (id, name, created_at) VALUES (?, 'TestProj', '2024-01-01')",
        )
        .bind(&proj_id)
        .execute(&p)
        .await
        .unwrap();
        (p, proj_id)
    }

    fn reg(email: &str) -> RegisterRequest {
        RegisterRequest {
            email: email.to_string(),
            password: "Password1!".into(),
            metadata: None,
        }
    }

    #[tokio::test]
    async fn test_register_and_get() {
        let (p, proj) = pool_with_project().await;
        let user = AuthUser::create(&p, &proj, reg("a@b.com")).await.unwrap();
        assert_eq!(user.email, "a@b.com");

        let fetched = AuthUser::get_by_id(&p, &proj, &user.id).await.unwrap();
        assert_eq!(fetched.id, user.id);
    }

    #[tokio::test]
    async fn test_duplicate_email_conflicts() {
        let (p, proj) = pool_with_project().await;
        AuthUser::create(&p, &proj, reg("dup@b.com")).await.unwrap();
        let err = AuthUser::create(&p, &proj, reg("dup@b.com")).await.unwrap_err();
        assert!(matches!(err, AppError::Conflict(_)));
    }

    #[tokio::test]
    async fn test_login_correct_password() {
        let (p, proj) = pool_with_project().await;
        AuthUser::create(&p, &proj, reg("login@b.com")).await.unwrap();
        let resp = AuthUser::login(
            &p,
            &proj,
            LoginRequest {
                email: "login@b.com".into(),
                password: "Password1!".into(),
            },
            SECRET,
            24,
        )
        .await
        .unwrap();
        assert!(!resp.token.is_empty());
        assert_eq!(resp.user.email, "login@b.com");
    }

    #[tokio::test]
    async fn test_login_wrong_password_fails() {
        let (p, proj) = pool_with_project().await;
        AuthUser::create(&p, &proj, reg("x@b.com")).await.unwrap();
        let err = AuthUser::login(
            &p,
            &proj,
            LoginRequest {
                email: "x@b.com".into(),
                password: "wrong".into(),
            },
            SECRET,
            24,
        )
        .await
        .unwrap_err();
        assert!(matches!(err, AppError::Unauthorized(_)));
    }

    #[tokio::test]
    async fn test_login_unknown_email_fails() {
        let (p, proj) = pool_with_project().await;
        let err = AuthUser::login(
            &p,
            &proj,
            LoginRequest {
                email: "no@b.com".into(),
                password: "pw".into(),
            },
            SECRET,
            24,
        )
        .await
        .unwrap_err();
        assert!(matches!(err, AppError::Unauthorized(_)));
    }

    #[test]
    fn test_generate_and_validate_jwt() {
        let user = AuthUser {
            id: "uid1".into(),
            project_id: "pid1".into(),
            email: "e@e.com".into(),
            password_hash: "h".into(),
            metadata: "{}".into(),
            created_at: "now".into(),
        };
        let token = generate_jwt(&user, SECRET, 1).unwrap();
        let claims = validate_jwt(&token, SECRET).unwrap();
        assert_eq!(claims.sub, "uid1");
        assert_eq!(claims.project_id, "pid1");
    }

    #[test]
    fn test_validate_bad_token_fails() {
        let err = validate_jwt("not.a.token", SECRET).unwrap_err();
        assert!(matches!(err, AppError::Unauthorized(_)));
    }

    #[test]
    fn test_validate_wrong_secret_fails() {
        let user = AuthUser {
            id: "u".into(),
            project_id: "p".into(),
            email: "e@e.com".into(),
            password_hash: "h".into(),
            metadata: "{}".into(),
            created_at: "t".into(),
        };
        let token = generate_jwt(&user, SECRET, 1).unwrap();
        let err = validate_jwt(&token, "wrong-secret").unwrap_err();
        assert!(matches!(err, AppError::Unauthorized(_)));
    }

    #[tokio::test]
    async fn test_delete_user() {
        let (p, proj) = pool_with_project().await;
        let u = AuthUser::create(&p, &proj, reg("del@b.com")).await.unwrap();
        AuthUser::delete(&p, &proj, &u.id).await.unwrap();
        let err = AuthUser::get_by_id(&p, &proj, &u.id).await.unwrap_err();
        assert!(matches!(err, AppError::NotFound(_)));
    }
}
