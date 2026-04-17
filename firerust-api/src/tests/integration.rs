// tests/integration.rs
//
// Full-stack integration tests that spin up a real router wired to an
// in-memory SQLite database.  No network ports are opened; we drive the
// router with `tower::ServiceExt::oneshot`.

use axum::{
    body::Body,
    http::{header, Method, Request, StatusCode},
};
use firerust::{
    db,
    state::AppState,
    build_router,
};
use serde_json::{json, Value};
use std::sync::Arc;
use tower::ServiceExt; // for `.oneshot()`

// ─── Helpers ──────────────────────────────────────────────────────────────────

fn test_config() -> firerust::config::Config {
    firerust::config::Config {
        db_path: ":memory:".into(),
        secret_key: "integration-test-secret-long-enough".into(),
        admin_key: "test-admin-key".into(),
        uploads_folder: "/tmp/firerust-test-uploads".into(),
        jwt_expiry_hours: 24,
        host: "127.0.0.1".into(),
        port: 3000,
    }
}

async fn setup() -> Arc<AppState> {
    let pool = db::create_pool(":memory:").await.unwrap();
    db::run_migrations(&pool).await.unwrap();
    AppState::new(pool, test_config())
}

fn json_body(v: &Value) -> Body {
    Body::from(serde_json::to_vec(v).unwrap())
}

fn admin_post(uri: &str, body: &Value) -> Request<Body> {
    Request::builder()
        .method(Method::POST)
        .uri(uri)
        .header(header::CONTENT_TYPE, "application/json")
        .header("x-admin-key", "test-admin-key")
        .body(json_body(body))
        .unwrap()
}

fn admin_get(uri: &str) -> Request<Body> {
    Request::builder()
        .method(Method::GET)
        .uri(uri)
        .header("x-admin-key", "test-admin-key")
        .body(Body::empty())
        .unwrap()
}

fn admin_delete(uri: &str) -> Request<Body> {
    Request::builder()
        .method(Method::DELETE)
        .uri(uri)
        .header("x-admin-key", "test-admin-key")
        .body(Body::empty())
        .unwrap()
}

fn bearer_post(uri: &str, token: &str, body: &Value) -> Request<Body> {
    Request::builder()
        .method(Method::POST)
        .uri(uri)
        .header(header::CONTENT_TYPE, "application/json")
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .body(json_body(body))
        .unwrap()
}

fn bearer_get(uri: &str, token: &str) -> Request<Body> {
    Request::builder()
        .method(Method::GET)
        .uri(uri)
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .body(Body::empty())
        .unwrap()
}

fn bearer_delete(uri: &str, token: &str) -> Request<Body> {
    Request::builder()
        .method(Method::DELETE)
        .uri(uri)
        .header(header::AUTHORIZATION, format!("Bearer {}", token))
        .body(Body::empty())
        .unwrap()
}

async fn body_json(resp: axum::response::Response) -> Value {
    let bytes = axum::body::to_bytes(resp.into_body(), usize::MAX)
        .await
        .unwrap();
    serde_json::from_slice(&bytes).unwrap_or(Value::Null)
}

// ─── Healthcheck ──────────────────────────────────────────────────────────────

#[tokio::test]
async fn test_health_returns_ok() {
    let state = setup().await;
    let app = build_router(state);
    let req = Request::builder()
        .uri("/health")
        .body(Body::empty())
        .unwrap();
    let resp = app.oneshot(req).await.unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
    let body = body_json(resp).await;
    assert_eq!(body["status"], "ok");
}

// ─── Admin – Projects ─────────────────────────────────────────────────────────

#[tokio::test]
async fn test_admin_create_project() {
    let state = setup().await;
    let app = build_router(state);
    let resp = app
        .oneshot(admin_post("/admin/projects", &json!({"name":"myapp"})))
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::CREATED);
    let body = body_json(resp).await;
    assert_eq!(body["name"], "myapp");
    assert!(body["id"].is_string());
}

#[tokio::test]
async fn test_admin_create_project_requires_key() {
    let state = setup().await;
    let app = build_router(state);
    let req = Request::builder()
        .method(Method::POST)
        .uri("/admin/projects")
        .header(header::CONTENT_TYPE, "application/json")
        // no x-admin-key header
        .body(json_body(&json!({"name":"x"})))
        .unwrap();
    let resp = app.oneshot(req).await.unwrap();
    assert_eq!(resp.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn test_admin_list_projects() {
    let state = setup().await;
    let app = build_router(Arc::clone(&state));
    // create two projects directly
    {
        let app2 = build_router(Arc::clone(&state));
        app2.oneshot(admin_post("/admin/projects", &json!({"name":"p1"})))
            .await
            .unwrap();
    }
    {
        let app3 = build_router(Arc::clone(&state));
        app3.oneshot(admin_post("/admin/projects", &json!({"name":"p2"})))
            .await
            .unwrap();
    }
    let resp = app.oneshot(admin_get("/admin/projects")).await.unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
    let body = body_json(resp).await;
    assert_eq!(body.as_array().unwrap().len(), 2);
}

#[tokio::test]
async fn test_admin_duplicate_project_conflicts() {
    let state = setup().await;
    {
        let app = build_router(Arc::clone(&state));
        app.oneshot(admin_post("/admin/projects", &json!({"name":"dup"})))
            .await
            .unwrap();
    }
    let app = build_router(Arc::clone(&state));
    let resp = app
        .oneshot(admin_post("/admin/projects", &json!({"name":"dup"})))
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::CONFLICT);
}

#[tokio::test]
async fn test_admin_delete_project() {
    let state = setup().await;
    // create
    let create_resp = {
        let app = build_router(Arc::clone(&state));
        let r = app
            .oneshot(admin_post("/admin/projects", &json!({"name":"todel"})))
            .await
            .unwrap();
        body_json(r).await
    };
    let pid = create_resp["id"].as_str().unwrap().to_string();

    // delete
    let app = build_router(Arc::clone(&state));
    let resp = app
        .oneshot(admin_delete(&format!("/admin/projects/{}", pid)))
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::NO_CONTENT);

    // get should 404
    let app = build_router(Arc::clone(&state));
    let resp = app
        .oneshot(admin_get(&format!("/admin/projects/{}", pid)))
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::NOT_FOUND);
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

async fn create_project_and_register(
    state: &Arc<AppState>,
) -> (String, String, String) {
    // Create project
    let proj_body = {
        let app = build_router(Arc::clone(state));
        let r = app
            .oneshot(admin_post("/admin/projects", &json!({"name":"authtest"})))
            .await
            .unwrap();
        body_json(r).await
    };
    let pid = proj_body["id"].as_str().unwrap().to_string();

    // Register user
    let reg_body = {
        let app = build_router(Arc::clone(state));
        let r = app
            .oneshot(admin_post(
                &format!("/api/{}/auth/register", pid),
                &json!({"email":"u@test.com","password":"Pass1!"}),
            ))
            .await
            .unwrap();
        body_json(r).await
    };
    let uid = reg_body["id"].as_str().unwrap().to_string();

    // Login
    let login_body = {
        let app = build_router(Arc::clone(state));
        let r = app
            .oneshot(admin_post(
                &format!("/api/{}/auth/login", pid),
                &json!({"email":"u@test.com","password":"Pass1!"}),
            ))
            .await
            .unwrap();
        body_json(r).await
    };
    let token = login_body["token"].as_str().unwrap().to_string();
    (pid, uid, token)
}

#[tokio::test]
async fn test_register_returns_created() {
    let state = setup().await;
    let proj = {
        let app = build_router(Arc::clone(&state));
        let r = app
            .oneshot(admin_post("/admin/projects", &json!({"name":"rtest"})))
            .await
            .unwrap();
        body_json(r).await
    };
    let pid = proj["id"].as_str().unwrap();
    let app = build_router(Arc::clone(&state));
    let resp = app
        .oneshot(admin_post(
            &format!("/api/{}/auth/register", pid),
            &json!({"email":"new@b.com","password":"pw"}),
        ))
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::CREATED);
    let body = body_json(resp).await;
    assert_eq!(body["email"], "new@b.com");
    assert!(body.get("password_hash").is_none()); // never leak hashes
}

#[tokio::test]
async fn test_login_returns_token() {
    let state = setup().await;
    let (pid, _uid, token) = create_project_and_register(&state).await;
    assert!(!token.is_empty());

    // /me should work
    let app = build_router(Arc::clone(&state));
    let resp = app
        .oneshot(bearer_get(&format!("/api/{}/auth/me", pid), &token))
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
    let body = body_json(resp).await;
    assert_eq!(body["email"], "u@test.com");
}

#[tokio::test]
async fn test_login_wrong_password_returns_401() {
    let state = setup().await;
    let (pid, _uid, _token) = create_project_and_register(&state).await;
    let app = build_router(Arc::clone(&state));
    let resp = app
        .oneshot(admin_post(
            &format!("/api/{}/auth/login", pid),
            &json!({"email":"u@test.com","password":"WRONG"}),
        ))
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn test_me_without_token_returns_401() {
    let state = setup().await;
    let (pid, _uid, _token) = create_project_and_register(&state).await;
    let app = build_router(Arc::clone(&state));
    let req = Request::builder()
        .uri(format!("/api/{}/auth/me", pid))
        .body(Body::empty())
        .unwrap();
    let resp = app.oneshot(req).await.unwrap();
    assert_eq!(resp.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn test_admin_list_users() {
    let state = setup().await;
    let (pid, _uid, _token) = create_project_and_register(&state).await;
    let app = build_router(Arc::clone(&state));
    let resp = app
        .oneshot(admin_get(&format!("/api/{}/auth/users", pid)))
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
    let body = body_json(resp).await;
    assert_eq!(body.as_array().unwrap().len(), 1);
}

#[tokio::test]
async fn test_admin_delete_user() {
    let state = setup().await;
    let (pid, uid, _token) = create_project_and_register(&state).await;
    let app = build_router(Arc::clone(&state));
    let resp = app
        .oneshot(admin_delete(&format!("/api/{}/auth/users/{}", pid, uid)))
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::NO_CONTENT);
}

// ─── DB model ─────────────────────────────────────────────────────────────────

#[tokio::test]
async fn test_create_collection() {
    let state = setup().await;
    let (pid, _uid, token) = create_project_and_register(&state).await;
    let app = build_router(Arc::clone(&state));
    let resp = app
        .oneshot(bearer_post(
            &format!("/api/{}/db/collections", pid),
            &token,
            &json!({"name":"todos","schema":{"title":{"type":"string"}}}),
        ))
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::CREATED);
    let body = body_json(resp).await;
    assert_eq!(body["name"], "todos");
}

#[tokio::test]
async fn test_list_collections() {
    let state = setup().await;
    let (pid, _uid, token) = create_project_and_register(&state).await;
    {
        let app = build_router(Arc::clone(&state));
        app.oneshot(bearer_post(
            &format!("/api/{}/db/collections", pid),
            &token,
            &json!({"name":"col1"}),
        ))
        .await
        .unwrap();
    }
    let app = build_router(Arc::clone(&state));
    let resp = app
        .oneshot(bearer_get(&format!("/api/{}/db/collections", pid), &token))
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::OK);
    let body = body_json(resp).await;
    assert_eq!(body["collections"].as_array().unwrap().len(), 1);
}

#[tokio::test]
async fn test_cross_project_token_rejected() {
    let state = setup().await;
    // Create two separate projects with their own users
    let (pid1, _uid1, token1) = create_project_and_register(&state).await;
    // Create second project with a different name
    let proj2 = {
        let app = build_router(Arc::clone(&state));
        let r = app
            .oneshot(admin_post("/admin/projects", &json!({"name":"proj2"})))
            .await
            .unwrap();
        body_json(r).await
    };
    let pid2 = proj2["id"].as_str().unwrap().to_string();

    // Register user in project2
    {
        let app = build_router(Arc::clone(&state));
        app.oneshot(admin_post(
            &format!("/api/{}/auth/register", pid2),
            &json!({"email":"b@test.com","password":"pw"}),
        ))
        .await
        .unwrap();
    }

    // Use token1 (project1) to hit project2 — must be 403
    let app = build_router(Arc::clone(&state));
    let resp = app
        .oneshot(bearer_get(&format!("/api/{}/auth/me", pid2), &token1))
        .await
        .unwrap();
    assert_eq!(resp.status(), StatusCode::FORBIDDEN);

    let _ = pid1; // suppress unused warning
}
