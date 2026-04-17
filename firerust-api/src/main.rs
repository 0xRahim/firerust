use firerust::{build_router, config, db, state::AppState};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "firerust=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    let config_path = std::env::args().nth(1).unwrap_or_else(|| "config.json".to_string());
    let cfg = config::Config::load(&config_path)?;
    tracing::info!("Loaded config from '{}'", config_path);

    let pool = db::create_pool(&cfg.db_path).await?;
    db::run_migrations(&pool).await?;
    tracing::info!("Database ready at '{}'", cfg.db_path);

    tokio::fs::create_dir_all(&cfg.uploads_folder).await?;

    let state = AppState::new(pool, cfg.clone());
    let app = build_router(state);

    let addr = format!("{}:{}", cfg.host, cfg.port);
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    tracing::info!("🔥 Firerust listening on http://{}", addr);
    axum::serve(listener, app).await?;
    Ok(())
}
