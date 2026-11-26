//! Browser downloads, read from the Downloads folder: a browser writes to a
//! partial file (`.crdownload`, `.part`…) and renames it when it's done. Size
//! and speed come from the partial file growing; the total isn't on disk, so
//! there's no percentage. A finished download goes on the shelf.

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::time::{Duration, Instant, SystemTime};

use serde::Serialize;
use tauri::Manager;

use super::Ctx;
use crate::settings::Settings;

const POLL: Duration = Duration::from_secs(1);
/// A partial file untouched for this long is a paused or abandoned download.
const STALLED: Duration = Duration::from_secs(30);
/// Chrome & co., Firefox, old Edge, Safari.
const PARTIAL: [&str; 4] = ["crdownload", "part", "partial", "download"];
const ENABLED_KEYS: [(&str, bool); 2] = [("module.shelf.enabled", true), ("shelf.downloads", true)];

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Download {
    /// The name it will have once done.
    pub name: String,
    pub bytes: u64,
    /// Bytes per second, smoothed.
    pub speed: u64,
}

struct Seen {
    bytes: u64,
    at: Instant,
    speed: f64,
}

/// `file.zip.crdownload` → `file.zip`; `None` for anything that isn't a download
/// in progress (Chrome's `Unconfirmed 1234.crdownload` waits on a Save As dialog).
fn final_path(partial: &Path) -> Option<PathBuf> {
    let ext = partial.extension()?.to_str()?.to_ascii_lowercase();
    let stem = partial.file_stem()?.to_str()?;
    (PARTIAL.contains(&ext.as_str()) && !stem.starts_with("Unconfirmed ") && stem.contains('.'))
        .then(|| partial.with_file_name(stem))
}

fn downloads_dir() -> Option<PathBuf> {
    use windows::Win32::System::Com::CoTaskMemFree;
    use windows::Win32::UI::Shell::{FOLDERID_Downloads, KNOWN_FOLDER_FLAG, SHGetKnownFolderPath};
    unsafe {
        let p = SHGetKnownFolderPath(&FOLDERID_Downloads, KNOWN_FOLDER_FLAG(0), None).ok()?;
        let path = p.to_string().ok();
        CoTaskMemFree(Some(p.0 as _));
        path.map(PathBuf::from)
    }
}

/// Partial files written to in the last `STALLED`, with their size.
fn scan(dir: &Path) -> Vec<(PathBuf, u64)> {
    let Ok(entries) = std::fs::read_dir(dir) else {
        return vec![];
    };
    let now = SystemTime::now();
    entries
        .flatten()
        .filter(|e| final_path(&e.path()).is_some())
        .filter_map(|e| {
            let meta = e.metadata().ok()?;
            let fresh = meta
                .modified()
                .ok()
                .and_then(|t| now.duration_since(t).ok())
                .is_some_and(|age| age < STALLED);
            fresh.then(|| (e.path(), meta.len()))
        })
        .collect()
}

fn enabled(ctx: &Ctx) -> bool {
    let settings = ctx.hub.app().state::<Settings>();
    ENABLED_KEYS.iter().all(|(key, default)| {
        settings
            .get(key)
            .and_then(|v| v.as_bool())
            .unwrap_or(*default)
    })
}

pub(super) fn watch(ctx: &Ctx) {
    let Some(dir) = downloads_dir() else { return };
    let mut seen: HashMap<PathBuf, Seen> = HashMap::new();
    loop {
        std::thread::sleep(POLL);
        let now = Instant::now();
        let found = if enabled(ctx) { scan(&dir) } else { vec![] };

        // Gone from the list and its final file is there: it finished.
        let done: Vec<PathBuf> = seen
            .keys()
            .filter(|p| !found.iter().any(|(f, _)| f == *p))
            .filter_map(|p| final_path(p))
            .filter(|f| f.metadata().is_ok_and(|m| m.len() > 0))
            .collect();
        let mut next = HashMap::new();
        let mut list = vec![];
        for (path, bytes) in found {
            let speed = match seen.remove(&path) {
                Some(s) => {
                    let secs = now.duration_since(s.at).as_secs_f64().max(0.1);
                    let instant = bytes.saturating_sub(s.bytes) as f64 / secs;
                    s.speed * 0.6 + instant * 0.4
                }
                None => 0.0,
            };
            list.push(Download {
                name: final_path(&path)
                    .and_then(|f| f.file_name().map(|n| n.to_string_lossy().to_string()))
                    .unwrap_or_default(),
                bytes,
                speed: speed as u64,
            });
            next.insert(
                path,
                Seen {
                    bytes,
                    at: now,
                    speed,
                },
            );
        }
        seen = next;
        list.sort_by(|a, b| a.name.cmp(&b.name));

        let changed = *ctx.downloads.lock().unwrap() != list;
        *ctx.downloads.lock().unwrap() = list;
        if done.is_empty() {
            if changed {
                let paths = ctx.paths.lock().unwrap().clone();
                ctx.publish(&paths); // progress only: the shelf itself is unchanged
            }
            continue;
        }
        if let Some(last) = done.last() {
            let name = last.file_name().map(|n| n.to_string_lossy().to_string());
            *ctx.finished.lock().unwrap() = name.map(|n| format!("{}:{n}", super::super::now_ms()));
            let mut paths = ctx.paths.lock().unwrap();
            for p in &done {
                let p = p.to_string_lossy().to_string();
                paths.retain(|q| !q.eq_ignore_ascii_case(&p));
                paths.insert(0, p);
            }
        }
        ctx.commit();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn names_partial_files() {
        let f = |s: &str| final_path(Path::new(s)).map(|p| p.to_string_lossy().to_string());
        assert_eq!(
            f(r"C:\d\setup.exe.crdownload").as_deref(),
            Some(r"C:\d\setup.exe")
        );
        assert_eq!(
            f(r"C:\d\movie.mp4.part").as_deref(),
            Some(r"C:\d\movie.mp4")
        );
        assert_eq!(f(r"C:\d\Unconfirmed 81723.crdownload"), None);
        assert_eq!(f(r"C:\d\notes.txt"), None);
        assert_eq!(f(r"C:\d\noext.part"), None);
    }
}
