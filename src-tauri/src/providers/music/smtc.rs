//! Now-playing metadata and transport controls through SMTC.

use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc::{self, Receiver, RecvTimeoutError, Sender};
use std::time::{Duration, Instant};

use base64::Engine;
use serde_json::Value;
use tauri::Manager;
use windows::Foundation::TypedEventHandler;
use windows::Media::Control::{
    GlobalSystemMediaTransportControlsSession as Session,
    GlobalSystemMediaTransportControlsSessionManager as SessionManager,
    GlobalSystemMediaTransportControlsSessionPlaybackStatus as Status,
};
use windows::Storage::Streams::DataReader;
use windows::core::Result;

use super::focus::TitleWatch;
use super::spotify::{self, Spotify};
use super::{ID, MusicState};
use crate::hub::Hub;
use crate::providers::{now_ms, process};
use crate::settings::Settings;

/// Off by default: the YouTube lookup is a search request per browser track.
const VIDEO_KEY: &str = "music.video.label";

/// Artwork is read again this often, since players replace it (Spotify
/// first publishes its logo, then the cover once it has loaded it). Their
/// "media properties changed" event re-reads it at once anyway.
const ART_REFRESH: Duration = Duration::from_secs(4);
/// While a track has no real artwork yet: every poll at first, then this often.
const ART_RETRY: Duration = Duration::from_secs(2);
/// Reads right after a track change, whatever came first (often the last
/// track's cover, still in place).
const ART_FAST_TRIES: u8 = 8;
/// Polling is only the fallback: the media controls' events wake the loop.
const POLL_PLAYING: Duration = Duration::from_millis(500);
const POLL_PAUSED: Duration = Duration::from_millis(1000);
/// Players update title, artist, artwork… one after another: let them land
/// before reading, so a new title never shows with the old artist.
const SETTLE: Duration = Duration::from_millis(40);
/// How often Spotify's window title is read between polls: it names the new
/// track at once, while Spotify's media controls lag seconds behind (or keep
/// showing a track it already left).
const WINDOW_CHECK: Duration = Duration::from_millis(100);

/// 100ns ticks between 1601-01-01 and 1970-01-01.
const EPOCH_DIFF_TICKS: i64 = 116_444_736_000_000_000;

pub fn poll_loop(hub: Arc<Hub>, playing_flag: Arc<AtomicBool>, spotify: Arc<Spotify>) {
    let mut manager: Option<SessionManager> = None;
    let mut track_key = String::new();
    let mut published: Option<MusicState> = None;
    let mut art = Artwork::default();
    let youtube = super::youtube::Resolver::default();
    // `true`: the media properties changed (the artwork may have too).
    let (wake_tx, wake) = mpsc::channel::<bool>();
    let mut watched: Option<Watched> = None;
    let mut window = TitleWatch::new("spotify");
    let mut window_title: Option<String> = None;
    // The track Spotify's window named before its media controls did, and since when (unix ms).
    let mut window_track: Option<((String, String), u64)> = None;

    loop {
        if manager.is_none() {
            manager = SessionManager::RequestAsync().and_then(|op| op.join()).ok();
            if let Some(m) = &manager {
                watch_manager(m, &wake_tx);
            }
            watched = None;
        }
        let state = match manager.as_ref().map(read_state) {
            Some(Ok(Some((mut state, session)))) => {
                window_title = if spotify::is_spotify(&state.app_id) {
                    window.title()
                } else {
                    None
                };
                let ahead = window_title
                    .as_deref()
                    .and_then(|w| ahead_of_smtc(w, &state.artist, &state.title));
                if let Some(track) = ahead {
                    let since = match &window_track {
                        Some((t, since)) if *t == track => *since,
                        _ => state.position_at,
                    };
                    window_track = Some((track.clone(), since));
                    // The window is right: its track, without the other one's album, cover or length.
                    (state.artist, state.title) = track;
                    state.album.clear();
                    state.playing = true;
                    state.duration_ms = 0;
                    state.position_ms = state.position_at.saturating_sub(since);
                } else {
                    window_track = None;
                }
                let key = format!(
                    "{}|{}|{}|{}",
                    state.app_id, state.title, state.artist, state.album
                );
                if key != track_key {
                    track_key = key;
                    art = Artwork::default();
                }
                if watched.as_ref().is_none_or(|w| w.app_id != state.app_id) {
                    watched = Watched::new(&session, &state.app_id, &wake_tx);
                }
                if window_track.is_none() {
                    art.refresh(&session);
                    state.thumbnail = art.url.clone();
                }
                let video = hub
                    .app()
                    .state::<Settings>()
                    .get(VIDEO_KEY)
                    .and_then(|v| v.as_bool())
                    .unwrap_or(false);
                if video {
                    state.youtube_id = youtube.video_id(&state);
                }
                state.volume = super::volume::system();
                let local = super::volume::app(&state.app_id);
                spotify.set_wanted(local.is_none() && spotify::is_spotify(&state.app_id));
                if let Some((volume, exe)) = local {
                    state.app_volume = Some(volume);
                    state.app_icon = process::app_icon(&exe);
                } else if spotify::is_spotify(&state.app_id)
                    && let Some((volume, device)) = spotify.volume()
                {
                    state.app_volume = Some(volume);
                    state.app_device = Some(device);
                    // The desktop app still runs here, just silent: its icon.
                    state.app_icon =
                        process::find_exe("spotify").and_then(|exe| process::app_icon(&exe));
                }
                state
            }
            Some(Ok(None)) => {
                spotify.set_wanted(false);
                MusicState::default()
            }
            Some(Err(_)) | None => {
                manager = None;
                MusicState::default()
            }
        };
        playing_flag.store(state.playing, Ordering::Relaxed);
        // The island projects the position from `positionAt`; while that stays
        // right, a new poll changes nothing on screen (and the state carries the cover).
        if !published.as_ref().is_some_and(|old| on_course(old, &state)) {
            hub.publish(ID, &state);
            published = Some(state.clone());
        }
        let poll = if state.playing {
            POLL_PLAYING
        } else {
            POLL_PAUSED
        };
        let seen = window_title.clone();
        let slice = seen.is_some().then_some(WINDOW_CHECK);
        if wait(&wake, poll, slice, || window.title() != seen) {
            art.read_now();
        }
    }
}

/// Sleeps until the next poll or an event, whichever comes first, checking
/// `changed` every `slice` meanwhile. True when the media properties (or the
/// player's window) changed.
fn wait(
    wake: &Receiver<bool>,
    poll: Duration,
    slice: Option<Duration>,
    mut changed: impl FnMut() -> bool,
) -> bool {
    let end = Instant::now() + poll;
    loop {
        let left = end.saturating_duration_since(Instant::now());
        if left.is_zero() {
            return false;
        }
        match wake.recv_timeout(slice.map_or(left, |s| s.min(left))) {
            Ok(mut props) => {
                std::thread::sleep(SETTLE);
                while let Ok(more) = wake.try_recv() {
                    props |= more;
                }
                return props;
            }
            Err(RecvTimeoutError::Timeout) if slice.is_some() && changed() => return true,
            Err(RecvTimeoutError::Timeout) => {}
            Err(RecvTimeoutError::Disconnected) => {
                std::thread::sleep(left);
                return false;
            }
        }
    }
}

/// Spotify's window title ("Artist - Title") when it names another track
/// than the media controls do. `None` when they agree, or when the window
/// names no track ("Spotify Premium" while paused).
fn ahead_of_smtc(window: &str, artist: &str, title: &str) -> Option<(String, String)> {
    let (w_artist, w_title) = window.split_once(" - ")?;
    if w_artist.is_empty() || w_title.is_empty() {
        return None;
    }
    if w_title == title || window == format!("{artist} - {title}") {
        return None;
    }
    Some((w_artist.to_string(), w_title.to_string()))
}

/// Another app took over the media controls, or one came or went.
fn watch_manager(manager: &SessionManager, wake: &Sender<bool>) {
    let tx = wake.clone();
    let _ = manager.CurrentSessionChanged(&TypedEventHandler::new(move |_, _| {
        let _ = tx.send(true);
        Ok(())
    }));
    let tx = wake.clone();
    let _ = manager.SessionsChanged(&TypedEventHandler::new(move |_, _| {
        let _ = tx.send(true);
        Ok(())
    }));
}

/// The session being shown, subscribed to its changes so a new track, its
/// artwork or a play/pause shows up at once instead of at the next poll.
struct Watched {
    app_id: String,
    session: Session,
    props: i64,
    playback: i64,
}

impl Watched {
    fn new(session: &Session, app_id: &str, wake: &Sender<bool>) -> Option<Self> {
        let tx = wake.clone();
        let props = session
            .MediaPropertiesChanged(&TypedEventHandler::new(move |_, _| {
                let _ = tx.send(true);
                Ok(())
            }))
            .ok()?;
        let tx = wake.clone();
        let playback = session
            .PlaybackInfoChanged(&TypedEventHandler::new(move |_, _| {
                let _ = tx.send(false);
                Ok(())
            }))
            .ok()?;
        Some(Self {
            app_id: app_id.to_string(),
            session: session.clone(),
            props,
            playback,
        })
    }
}

impl Drop for Watched {
    fn drop(&mut self) {
        let _ = self.session.RemoveMediaPropertiesChanged(self.props);
        let _ = self.session.RemovePlaybackInfoChanged(self.playback);
    }
}

pub fn control(action: &str, payload: Value) -> Result<()> {
    let manager = SessionManager::RequestAsync()?.join()?;
    let Some(session) = pick_session(&manager)? else {
        return Ok(());
    };
    match action {
        "toggle" => session.TryTogglePlayPauseAsync()?.join()?,
        "play" => session.TryPlayAsync()?.join()?,
        "pause" => session.TryPauseAsync()?.join()?,
        "next" => session.TrySkipNextAsync()?.join()?,
        "previous" => session.TrySkipPreviousAsync()?.join()?,
        "focus" => {
            let title = session
                .TryGetMediaPropertiesAsync()?
                .join()?
                .Title()?
                .to_string();
            super::focus::focus(&session.SourceAppUserModelId()?.to_string(), &title);
            true
        }
        "seek" => {
            let ms = payload.as_u64().unwrap_or(0) as i64;
            session
                .TryChangePlaybackPositionAsync(ms * 10_000)?
                .join()?
        }
        _ => false,
    };
    Ok(())
}

/// Prefer a session that is actively playing; fall back to the system's current one.
fn pick_session(manager: &SessionManager) -> Result<Option<Session>> {
    let sessions = manager.GetSessions()?;
    for session in &sessions {
        if session.GetPlaybackInfo()?.PlaybackStatus()? == Status::Playing {
            return Ok(Some(session));
        }
    }
    Ok(manager.GetCurrentSession().ok())
}

fn read_state(manager: &SessionManager) -> Result<Option<(MusicState, Session)>> {
    let Some(session) = pick_session(manager)? else {
        return Ok(None);
    };
    let props = session.TryGetMediaPropertiesAsync()?.join()?;
    let info = session.GetPlaybackInfo()?;
    let controls = info.Controls()?;
    let timeline = session.GetTimelineProperties()?;

    let title = props.Title()?.to_string();
    if title.is_empty() {
        return Ok(None);
    }

    let playing = info.PlaybackStatus()? == Status::Playing;
    let duration_ms =
        (timeline.EndTime()?.Duration - timeline.StartTime()?.Duration).max(0) as u64 / 10_000;
    let mut position_ms = timeline.Position()?.Duration.max(0) as u64 / 10_000;
    let now = now_ms();
    if playing {
        // Timeline is only refreshed occasionally; project it to "now".
        let updated = (timeline.LastUpdatedTime()?.UniversalTime - EPOCH_DIFF_TICKS) / 10_000;
        if updated > 0 && (updated as u64) < now {
            position_ms += now - updated as u64;
        }
    }
    if duration_ms > 0 {
        position_ms = position_ms.min(duration_ms);
    }

    let app_id = session.SourceAppUserModelId()?.to_string();
    let state = MusicState {
        available: true,
        playing,
        title,
        artist: props.Artist()?.to_string(),
        album: props.AlbumTitle()?.to_string(),
        app_name: friendly_app_name(&app_id),
        app_id,
        position_ms,
        position_at: now,
        duration_ms,
        thumbnail: None,
        can_next: controls.IsNextEnabled()?,
        can_previous: controls.IsPreviousEnabled()?,
        youtube_id: None,
        volume: None,
        app_volume: None,
        app_icon: None,
        app_device: None,
    };
    Ok(Some((state, session)))
}

/// The current track's artwork. Players publish it late and replace it
/// (Spotify hands out its own logo until the cover has loaded), so it is
/// read again now and then rather than once per track.
#[derive(Default)]
struct Artwork {
    /// Data URL of the real artwork; `None` while there is only a placeholder.
    url: Option<String>,
    /// What was read last, to skip re-encoding the same picture.
    last: Option<Vec<u8>>,
    tries: u8,
    next_read: Option<Instant>,
}

impl Artwork {
    fn refresh(&mut self, session: &Session) {
        let now = Instant::now();
        if self.next_read.is_some_and(|at| now < at) {
            return;
        }
        let read = read_thumbnail(session).ok().flatten();
        self.tries = self.tries.saturating_add(1);
        if let Some((bytes, mime)) = read
            && self.last.as_ref() != Some(&bytes)
        {
            self.url = (!is_placeholder(&bytes)).then(|| {
                let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
                format!("data:{mime};base64,{b64}")
            });
            self.last = Some(bytes);
        }
        self.next_read = Some(if self.tries < ART_FAST_TRIES {
            now
        } else if self.url.is_some() {
            now + ART_REFRESH
        } else {
            now + ART_RETRY
        });
    }

    /// The player says its properties changed: the artwork may have too.
    fn read_now(&mut self) {
        self.next_read = None;
    }
}

/// The artwork's bytes and type, as the player published them.
fn read_thumbnail(session: &Session) -> Result<Option<(Vec<u8>, String)>> {
    let props = session.TryGetMediaPropertiesAsync()?.join()?;
    let Ok(reference) = props.Thumbnail() else {
        return Ok(None);
    };
    let stream = reference.OpenReadAsync()?.join()?;
    let size = stream.Size()? as u32;
    if size == 0 {
        return Ok(None);
    }
    let mime = stream
        .ContentType()
        .map(|s| s.to_string())
        .unwrap_or_default();
    let reader = DataReader::CreateDataReader(&stream.GetInputStreamAt(0)?)?;
    reader.LoadAsync(size)?.join()?;
    let mut buf = vec![0u8; size as usize];
    reader.ReadBytes(&mut buf)?;
    let mime = if mime.is_empty() {
        "image/png".into()
    } else {
        mime
    };
    Ok(Some((buf, mime)))
}

/// A logo standing in for the cover: a white glyph on transparency, as
/// Spotify publishes before (or instead of) the album art. Real covers are
/// opaque pictures.
fn is_placeholder(bytes: &[u8]) -> bool {
    let mut decoder = png::Decoder::new(std::io::Cursor::new(bytes));
    decoder.set_transformations(png::Transformations::EXPAND | png::Transformations::STRIP_16);
    let Ok(mut reader) = decoder.read_info() else {
        return false; // not a PNG: a JPEG cover
    };
    let mut buf = vec![0u8; reader.output_buffer_size()];
    let Ok(info) = reader.next_frame(&mut buf) else {
        return false;
    };
    let pixels = &buf[..info.buffer_size()];
    let (gray, step) = match info.color_type {
        png::ColorType::Rgba => (false, 4),
        png::ColorType::GrayscaleAlpha => (true, 2),
        _ => return false, // no transparency: a picture
    };
    let px = pixels.chunks_exact(step);
    let alpha = |p: &[u8]| p[step - 1];
    let white = |p: &[u8]| {
        if gray {
            p[0] >= 245
        } else {
            p[0] >= 245 && p[1] >= 245 && p[2] >= 245
        }
    };
    px.clone().any(|p| alpha(p) < 255) && px.filter(|p| alpha(p) > 0).all(white)
}

fn friendly_app_name(app_id: &str) -> String {
    let lower = app_id.to_lowercase();
    let known = [
        ("spotify", "Spotify"),
        ("chrome", "Chrome"),
        ("msedge", "Edge"),
        ("firefox", "Firefox"),
        ("308046b0af4a39cb", "Firefox"),
        ("opera", "Opera"),
        ("brave", "Brave"),
        ("zunemusic", "Media Player"),
        ("applemusic", "Apple Music"),
        ("vlc", "VLC"),
        ("deezer", "Deezer"),
        ("tidal", "TIDAL"),
        ("youtube", "YouTube Music"),
    ];
    if let Some((_, name)) = known.iter().find(|(k, _)| lower.contains(k)) {
        return name.to_string();
    }
    app_id
        .rsplit(['\\', '!'])
        .next()
        .unwrap_or(app_id)
        .trim_end_matches(".exe")
        .to_string()
}

#[cfg(test)]
mod tests {
    use super::{ahead_of_smtc, is_placeholder};
    use crate::providers::clipboard::image::{Picture, encode_png};

    fn png(width: u32, height: u32, px: impl Fn(u32, u32) -> [u8; 4]) -> Vec<u8> {
        let rgba = (0..height)
            .flat_map(|y| (0..width).map(move |x| (x, y)))
            .flat_map(|(x, y)| px(x, y))
            .collect();
        encode_png(&Picture {
            width,
            height,
            rgba,
        })
        .unwrap()
    }

    #[test]
    fn spots_a_logo_standing_in_for_the_cover() {
        // A white disc on transparency, like Spotify's logo.
        let logo = png(20, 20, |x, y| {
            let inside = (x as i32 - 10).pow(2) + (y as i32 - 10).pow(2) < 64;
            if inside {
                [255, 255, 255, 255]
            } else {
                [0, 0, 0, 0]
            }
        });
        assert!(is_placeholder(&logo));
    }

    #[test]
    fn spotify_window_names_the_track_first() {
        let smtc = ("Childish Gambino", "Feels Like Summer");
        assert_eq!(
            ahead_of_smtc("okxyvro! - 100k", smtc.0, smtc.1),
            Some(("okxyvro!".into(), "100k".into()))
        );
        // Same track: the media controls' (with its cover) stands.
        assert_eq!(
            ahead_of_smtc("Childish Gambino - Feels Like Summer", smtc.0, smtc.1),
            None
        );
        // Titles with " - " in them, and several artists, still match.
        assert_eq!(
            ahead_of_smtc(
                "Queen - Bohemian Rhapsody - Remastered 2011",
                "Queen",
                "Bohemian Rhapsody - Remastered 2011"
            ),
            None
        );
        assert_eq!(
            ahead_of_smtc(
                "Tommy Richman - WEST COAST (feat. 03 Greedo)",
                "Tommy Richman, 03 Greedo",
                "WEST COAST (feat. 03 Greedo)"
            ),
            None
        );
        // Paused: no track in the title.
        assert_eq!(ahead_of_smtc("Spotify Premium", smtc.0, smtc.1), None);
    }

    #[test]
    fn keeps_real_covers() {
        let cover = png(20, 20, |x, y| [x as u8 * 12, y as u8 * 12, 90, 255]);
        assert!(!is_placeholder(&cover));
        // Colored art with a transparent margin is still art.
        let sticker = png(20, 20, |x, _| {
            if x < 4 {
                [0, 0, 0, 0]
            } else {
                [200, 40, 40, 255]
            }
        });
        assert!(!is_placeholder(&sticker));
        // Not a PNG at all (JPEG covers).
        assert!(!is_placeholder(&[0xff, 0xd8, 0xff, 0xe0]));
    }
}

/// How far the projected position may drift before it is published again.
const DRIFT_MS: i64 = 1000;

/// `new` only moved the clock: the position the island projects from `old` is still right.
fn on_course(old: &MusicState, new: &MusicState) -> bool {
    let same = MusicState {
        position_ms: old.position_ms,
        position_at: old.position_at,
        ..new.clone()
    };
    if same != *old {
        return false;
    }
    let moved = new.position_ms as i64 - old.position_ms as i64;
    let expected = if new.playing {
        new.position_at as i64 - old.position_at as i64
    } else {
        0
    };
    (moved - expected).abs() < DRIFT_MS
}

#[cfg(test)]
mod course_tests {
    use super::*;

    fn at(position_ms: u64, position_at: u64, playing: bool) -> MusicState {
        MusicState {
            playing,
            title: "Song".into(),
            position_ms,
            position_at,
            ..Default::default()
        }
    }

    #[test]
    fn only_time_passing_is_not_news() {
        assert!(on_course(&at(1000, 5000, true), &at(1500, 5500, true)));
        assert!(!on_course(&at(1000, 5000, true), &at(30_000, 5500, true))); // seek
        assert!(on_course(&at(1000, 5000, false), &at(1000, 9000, false)));
        assert!(!on_course(&at(1000, 5000, true), &at(1500, 5500, false))); // paused
        let mut other = at(1500, 5500, true);
        other.title = "Next".into();
        assert!(!on_course(&at(1000, 5000, true), &other));
    }
}
