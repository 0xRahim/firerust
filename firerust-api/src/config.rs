use serde::Deserialize;
use std::fs;

#[derive(Debug, Clone, Deserialize)]
pub struct Config {
    /// Path to the SQLite database file (e.g. "./data/app.db")
    pub db_path: String,
    /// HMAC secret used for signing JWTs
    pub secret_key: String,
    /// Key required in `X-Admin-Key` header for all admin routes
    pub admin_key: String,
    /// Directory where uploaded files are stored
    pub uploads_folder: String,
    /// How long issued JWTs remain valid (hours)
    #[serde(default = "default_jwt_expiry")]
    pub jwt_expiry_hours: u64,
    /// Bind host  (default: "0.0.0.0")
    #[serde(default = "default_host")]
    pub host: String,
    /// Bind port  (default: 3000)
    #[serde(default = "default_port")]
    pub port: u16,
}

fn default_jwt_expiry() -> u64 {
    24
}
fn default_host() -> String {
    "0.0.0.0".to_string()
}
fn default_port() -> u16 {
    3000
}

impl Config {
    pub fn load(path: &str) -> anyhow::Result<Self> {
        let content = fs::read_to_string(path)
            .map_err(|e| anyhow::anyhow!("Cannot read config file '{}': {}", path, e))?;
        let config: Config = serde_json::from_str(&content)
            .map_err(|e| anyhow::anyhow!("Invalid config JSON: {}", e))?;
        Ok(config)
    }
}

// ─── Unit tests ────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::NamedTempFile;

    fn write_config(json: &str) -> NamedTempFile {
        let mut f = NamedTempFile::new().unwrap();
        f.write_all(json.as_bytes()).unwrap();
        f
    }

    #[test]
    fn test_load_full_config() {
        let f = write_config(
            r#"{
              "db_path": "./data/app.db",
              "secret_key": "secret",
              "admin_key": "admin",
              "uploads_folder": "./uploads",
              "jwt_expiry_hours": 48,
              "host": "127.0.0.1",
              "port": 8080
            }"#,
        );
        let cfg = Config::load(f.path().to_str().unwrap()).unwrap();
        assert_eq!(cfg.port, 8080);
        assert_eq!(cfg.jwt_expiry_hours, 48);
        assert_eq!(cfg.host, "127.0.0.1");
    }

    #[test]
    fn test_load_minimal_config_uses_defaults() {
        let f = write_config(
            r#"{"db_path":"./db","secret_key":"s","admin_key":"a","uploads_folder":"./up"}"#,
        );
        let cfg = Config::load(f.path().to_str().unwrap()).unwrap();
        assert_eq!(cfg.jwt_expiry_hours, 24);
        assert_eq!(cfg.host, "0.0.0.0");
        assert_eq!(cfg.port, 3000);
    }

    #[test]
    fn test_load_missing_file_errors() {
        assert!(Config::load("does_not_exist.json").is_err());
    }

    #[test]
    fn test_load_invalid_json_errors() {
        let f = write_config("not-json");
        assert!(Config::load(f.path().to_str().unwrap()).is_err());
    }
}
