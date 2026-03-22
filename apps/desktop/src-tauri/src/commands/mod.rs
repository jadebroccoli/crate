#[tauri::command]
pub fn get_library_path() -> Result<String, String> {
    let home = dirs_next::home_dir().ok_or("Could not find home directory")?;
    let library_path = home.join("Music").join("CRATE");
    Ok(library_path.to_string_lossy().to_string())
}
