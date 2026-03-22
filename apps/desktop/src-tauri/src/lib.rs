mod commands;

use tauri::Manager;
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandChild;
use std::sync::Mutex;

struct BackendProcess(Mutex<Option<CommandChild>>);

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_deep_link::init())
        .manage(BackendProcess(Mutex::new(None)))
        .setup(|app| {
            // Spawn the backend sidecar (node.exe running server.mjs)
            let resource_dir = app.path().resource_dir()
                .expect("Failed to get resource dir");

            let server_script = resource_dir.join("binaries").join("server.mjs");
            let env_file = resource_dir.join("binaries").join(".env");
            let migrations_path = resource_dir.join("binaries").join("db").join("migrations");

            // Use app data dir for the database
            let app_data = app.path().app_data_dir()
                .expect("Failed to get app data dir");
            std::fs::create_dir_all(&app_data).ok();
            let db_path = app_data.join("crate.db");

            println!("[Tauri] Starting backend sidecar...");
            println!("[Tauri] Server script: {:?}", server_script);
            println!("[Tauri] Database: {:?}", db_path);

            let sidecar = app.shell()
                .sidecar("node")
                .expect("Failed to create sidecar command")
                .args(&[server_script.to_string_lossy().to_string()])
                .env("PORT", "4242")
                .env("DATABASE_URL", format!("file:{}", db_path.to_string_lossy()))
                .env("MIGRATIONS_PATH", migrations_path.to_string_lossy().to_string())
                .env("QUEUE_BACKEND", "memory")
                .env("DOTENV_CONFIG_PATH", env_file.to_string_lossy().to_string());

            match sidecar.spawn() {
                Ok((_rx, child)) => {
                    println!("[Tauri] Backend started");
                    let state: tauri::State<BackendProcess> = app.state();
                    *state.0.lock().unwrap() = Some(child);
                }
                Err(e) => {
                    eprintln!("[Tauri] Failed to start backend: {}", e);
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_library_path,
        ])
        .run(tauri::generate_context!())
        .expect("error while running CRATE");
}
