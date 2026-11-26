//! User settings: a flat JSON key/value store persisted in the app config dir.
//!
//! The backend doesn't know the schema — defaults and meaning live in the
//! frontend (each module declares its own settings). Every change is broadcast
//! as `settings://changed` so all windows stay in sync.

use std::path::PathBuf;
use std::sync::Mutex;

use serde_json::{Map, Value};
use tauri::{AppHandle, Emitter, Manager, State, WebviewUrl, WebviewWindowBuilder};

pub const CHANGED_EVENT: &str = "settings://changed";
pub const SETTINGS_LABEL: &str = "settings";

pub struct Settings {
    path: PathBuf,
    data: Mutex<Map<String, Value>>,
}

impl Settings {
    pub fn load(app: &AppHandle) -> Self {
        let path = app
            .path()
            .app_config_dir()
            .unwrap_or_else(|_| std::env::temp_dir())
            .join("settings.json");
        let data = std::fs::read_to_string(&path)
            .ok()
            .and_then(|t| serde_json::from_str::<Map<String, Value>>(&t).ok())
            .unwrap_or_default();
        Self {
            path,
            data: Mutex::new(data),
        }
    }

    /// Current raw value of a setting (`None` = never set, use the default).
    pub fn get(&self, key: &str) -> Option<Value> {
        self.data.lock().unwrap().get(key).cloned()
    }

    pub fn snapshot(&self) -> Map<String, Value> {
        self.data.lock().unwrap().clone()
    }

    fn save(&self, data: &Map<String, Value>) {
        if let Some(dir) = self.path.parent() {
            let _ = std::fs::create_dir_all(dir);
        }
        if let Ok(text) = serde_json::to_string_pretty(data) {
            let _ = std::fs::write(&self.path, text);
        }
    }
}

#[tauri::command]
pub fn get_settings(settings: State<Settings>) -> Map<String, Value> {
    settings.data.lock().unwrap().clone()
}

#[tauri::command]
pub fn set_setting(app: AppHandle, key: String, value: Value) {
    set(&app, &key, value);
}

/// Store and broadcast a setting (backend side of `setSetting`).
pub fn set(app: &AppHandle, key: &str, value: Value) {
    let settings = app.state::<Settings>();
    let snapshot = {
        let mut data = settings.data.lock().unwrap();
        data.insert(key.to_string(), value);
        settings.save(&data);
        data.clone()
    };
    let _ = app.emit(CHANGED_EVENT, snapshot);
    if key == crate::tray::HIDDEN_KEY {
        crate::tray::sync_hidden(app);
        crate::memory::sync_island(app);
    }
}

#[tauri::command]
pub fn open_settings(app: AppHandle) -> Result<(), String> {
    open(&app).map_err(|e| e.to_string())
}

pub fn open(app: &AppHandle) -> tauri::Result<()> {
    show(app, SETTINGS_LABEL)
}

pub const WELCOME_LABEL: &str = "welcome";
/// Set once the welcome tour is finished, skipped or closed.
const ONBOARDING_DONE: &str = "onboarding.done";

/// The welcome tour, again (About page).
#[tauri::command]
pub fn open_welcome(app: AppHandle) -> Result<(), String> {
    show(&app, WELCOME_LABEL).map_err(|e| e.to_string())
}

/// First run: the welcome tour, until it's been finished or put away.
pub fn welcome_on_first_run(app: &AppHandle) {
    let done = app
        .state::<Settings>()
        .get(ONBOARDING_DONE)
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    if !done {
        let _ = show(app, WELCOME_LABEL);
    }
}

/// Focus the window if it's open, or build it.
fn show(app: &AppHandle, label: &'static str) -> tauri::Result<()> {
    if let Some(win) = app.get_webview_window(label) {
        win.unminimize()?;
        win.show()?;
        return win.set_focus();
    }
    // Callers are sync commands / tray / single-instance handlers on the main
    // thread, where building a webview deadlocks on Windows (WebView2 needs the
    // event loop). Build from another thread instead.
    let app = app.clone();
    std::thread::spawn(move || {
        if let Err(e) = create(&app, label) {
            eprintln!("{label} window: {e}");
        }
    });
    Ok(())
}

fn create(app: &AppHandle, label: &str) -> tauri::Result<()> {
    let (title, (width, height)) = if label == WELCOME_LABEL {
        ("window.welcome", (760.0, 560.0))
    } else {
        ("window.settings", (860.0, 620.0))
    };
    let win = WebviewWindowBuilder::new(app, label, WebviewUrl::App("index.html".into()))
        .title(crate::i18n::t(app, title))
        .inner_size(width, height)
        .resizable(false)
        .center()
        // Custom titlebar lives in the webview (see `SettingsApp.tsx`, `WelcomeApp.tsx`).
        .decorations(false)
        .background_color(tauri::webview::Color(28, 28, 30, 255))
        .additional_browser_args(crate::memory::BROWSER_ARGS)
        .build()?;
    crate::memory::trim_when_minimized(&win);
    Ok(())
}

const REPO_URL: &str = "https://github.com/Nweremizu/dynamo";

/// Open the GitHub repo in the default browser (About page).
#[tauri::command]
pub fn open_repo() {
    open_url(REPO_URL);
}

/// Open a web page in the default browser (island links, e.g. usage pages).
#[tauri::command]
pub fn open_external(url: String) -> Result<(), String> {
    if !url.starts_with("https://") {
        return Err("only https links".into());
    }
    open_url(&url);
    Ok(())
}

/// Open a URL in the default browser.
pub fn open_url(url: &str) {
    #[cfg(windows)]
    unsafe {
        use windows::Win32::UI::Shell::ShellExecuteW;
        use windows::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL;
        use windows::core::{HSTRING, PCWSTR, w};
        ShellExecuteW(
            None,
            w!("open"),
            &HSTRING::from(url),
            PCWSTR::null(),
            PCWSTR::null(),
            SW_SHOWNORMAL,
        );
    }
}

#[tauri::command]
pub fn get_autostart(app: AppHandle) -> bool {
    crate::autostart::is_enabled(&app)
}

#[tauri::command]
pub fn set_autostart(app: AppHandle, enabled: bool) -> Result<bool, String> {
    crate::autostart::set(&app, enabled)
}
