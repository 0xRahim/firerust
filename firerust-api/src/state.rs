use crate::config::Config;
use sqlx::SqlitePool;
use std::sync::Arc;

#[derive(Clone)]
pub struct AppState {
    pub db: SqlitePool,
    pub config: Config,
}

impl AppState {
    pub fn new(db: SqlitePool, config: Config) -> Arc<Self> {
        Arc::new(Self { db, config })
    }
}
