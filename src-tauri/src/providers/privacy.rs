//! Which apps are using the microphone or the camera right now, like the
//! green and orange dots on the iPhone. Windows keeps this in the
//! CapabilityAccessManager consent store: an app is in use while its
//! `LastUsedTimeStart` is set and its `LastUsedTimeStop` is still 0.

use std::path::Path;
use std::sync::Arc;
use std::time::Duration;

use serde::Serialize;
use tauri::Manager;
use windows::Win32::System::Com::{COINIT_MULTITHREADED, CoInitializeEx};
use windows_registry::{CURRENT_USER, Key};

use super::{Provider, process};
use crate::hub::Hub;
use crate::settings::Settings;

pub const ID: &str = "privacy";
const ENABLED_KEY: &str = "module.privacy.enabled";
const STORE: &str =
    r"Software\Microsoft\Windows\CurrentVersion\CapabilityAccessManager\ConsentStore";
const POLL: Duration = Duration::from_secs(1);

#[derive(Debug, Clone, PartialEq, Serialize)]
struct App {
    name: String,
    /// The exe's icon as a data URL (desktop apps only).
    icon: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Default)]
struct State {
    mic: Vec<App>,
    camera: Vec<App>,
}

fn in_use(key: &Key) -> bool {
    key.get_u64("LastUsedTimeStart").is_ok_and(|t| t > 0)
        && key.get_u64("LastUsedTimeStop").is_ok_and(|t| t == 0)
}

/// Store apps are keyed by package family (`Microsoft.WindowsCamera_8wekyb3d8bbwe`).
fn package_name(family: &str) -> String {
    let name = family.split('_').next().unwrap_or(family);
    name.rsplit('.').next().unwrap_or(name).to_string()
}

/// Desktop apps are keyed by exe path with `#` for `\`.
fn desktop_app(key_name: &str) -> App {
    let path = key_name.replace('#', "\\");
    let path = Path::new(&path);
    App {
        name: process::app_name(path),
        icon: process::app_icon(path),
    }
}

fn running(key_name: &str) -> bool {
    let path = key_name.replace('#', "\\");
    !process::processes_named(&process::exe_stem(Path::new(&path))).is_empty()
}

fn apps_using(capability: &str) -> Vec<App> {
    let Ok(root) = CURRENT_USER.open(format!(r"{STORE}\{capability}")) else {
        return vec![];
    };
    let mut apps = vec![];
    for name in root.keys().into_iter().flatten() {
        if name == "NonPackaged" {
            let Ok(desktop) = root.open(&name) else {
                continue;
            };
            for exe in desktop.keys().into_iter().flatten() {
                // An app that quit or crashed with the mic open never gets its stop
                // time written, so it would read "in use" forever: also require it running.
                // ponytail: matched by exe name; a same-named exe elsewhere would count too.
                if desktop.open(&exe).is_ok_and(|k| in_use(&k)) && running(&exe) {
                    apps.push(desktop_app(&exe));
                }
            }
        } else if root.open(&name).is_ok_and(|k| in_use(&k)) {
            apps.push(App {
                name: package_name(&name),
                icon: None,
            });
        }
    }
    apps
}

#[derive(Default)]
pub struct PrivacyProvider;

impl Provider for PrivacyProvider {
    fn id(&self) -> &'static str {
        ID
    }

    fn start(self: Arc<Self>, hub: Arc<Hub>) {
        std::thread::spawn(move || {
            unsafe {
                let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
            }
            loop {
                let enabled = hub
                    .app()
                    .state::<Settings>()
                    .get(ENABLED_KEY)
                    .and_then(|v| v.as_bool())
                    .unwrap_or(true);
                let state = if enabled {
                    State {
                        mic: apps_using("microphone"),
                        camera: apps_using("webcam"),
                    }
                } else {
                    State::default()
                };
                hub.publish(ID, &state);
                std::thread::sleep(POLL);
            }
        });
    }
}

#[cfg(test)]
mod tests {
    use super::package_name;

    #[test]
    fn names_store_apps() {
        assert_eq!(
            package_name("Microsoft.WindowsCamera_8wekyb3d8bbwe"),
            "WindowsCamera"
        );
        assert_eq!(package_name("MSTeams_8wekyb3d8bbwe"), "MSTeams");
    }
}
