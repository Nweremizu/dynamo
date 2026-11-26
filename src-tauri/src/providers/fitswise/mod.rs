//! FitsWise: Beats Fit Pro battery and noise control, talking to the buds the
//! way the Android Beats app does (Apple "B2P" frames over RFCOMM channel 1).
//! `link.rs`, `protocol.rs` and `watcher.rs` come from the FitsWise app as they
//! are; this file is its controller, trimmed to what the island shows.
//!
//! The link opens only while Windows already uses the buds for audio (see
//! `watcher.rs`), so the island never pulls them away from a phone. Connect
//! and low-battery alerts come from the generic headphone watcher in
//! `activities/bluetooth.rs`.

// Copied whole from FitsWise to stay in step with it; the island uses a subset.
#[allow(dead_code)]
mod link;
#[allow(dead_code)]
mod protocol;
mod watcher;

use std::sync::mpsc::{Receiver, RecvTimeoutError, Sender, channel};
use std::sync::{Arc, Mutex, MutexGuard};
use std::time::{Duration, Instant};

use serde::Serialize;
use serde_json::Value;
use tauri::Manager;
use windows::Win32::System::Com::{COINIT_MULTITHREADED, CoInitializeEx};

use self::link::{Event, Link, LinkError};
use self::protocol::*;
use self::watcher::{Presence, Wake};
use super::Provider;
use crate::hub::Hub;
use crate::settings::Settings;

pub const ID: &str = "fitswise";
const ENABLED_KEY: &str = "module.fitswise.enabled";

/// Attempts per connection, so a busy pair is never hammered.
const MAX_OPENS: u32 = 3;
const RETRY: Duration = Duration::from_secs(2);
/// A link that lasted this long was healthy, so its loss doesn't count towards `MAX_OPENS`.
const HEALTHY: Duration = Duration::from_secs(10);
/// Windows drops and restores audio while buds move. Don't show a loss shorter than this.
const GRACE: Duration = Duration::from_millis(2500);
/// After this many tries a missing bud is taken to be switched off or far away.
const MAX_ASKS: u32 = 8;
const ASK_AGAIN: Duration = Duration::from_millis(1500);
/// The buds announce a new mode about 0.6 s after accepting it.
const MODE_CONFIRM: Duration = Duration::from_millis(1800);
/// How often a switched-off module looks whether it was switched back on.
const IDLE: Duration = Duration::from_secs(5);

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
enum Status {
    /// The module is switched off: nothing is watched.
    #[default]
    Off,
    BluetoothOff,
    NotPaired,
    Unsupported,
    Disconnected,
    Connecting,
    Connected,
    /// Windows is using the buds but they don't answer (the FitsWise app may hold the link).
    Silent,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
struct Buds {
    status: Status,
    name: Option<String>,
    battery: Battery,
    in_case: InCase,
    case_open: bool,
    mode: Option<Mode>,
    /// The FitsWise app is running (and likely holds the buds' only link).
    app_running: bool,
}

fn lock<T>(m: &Mutex<T>) -> MutexGuard<'_, T> {
    m.lock().unwrap_or_else(|e| e.into_inner())
}

struct Ctx {
    hub: Arc<Hub>,
    buds: Mutex<Buds>,
    link: Mutex<Option<(u64, Arc<Link>, Instant)>>,
    /// The mode being confirmed. Reports of the old one are ignored meanwhile.
    wanted: Mutex<Option<Mode>>,
    /// The last mode the buds announced.
    announced: Mutex<Option<Mode>>,
    wake: Sender<Wake>,
}

impl Ctx {
    fn snapshot(&self) -> Buds {
        lock(&self.buds).clone()
    }

    fn update(&self, f: impl FnOnce(&mut Buds)) {
        let mut b = lock(&self.buds);
        f(&mut b);
        self.hub.publish(ID, &*b); // the hub drops unchanged states
    }

    fn enabled(&self) -> bool {
        self.hub
            .app()
            .state::<Settings>()
            .get(ENABLED_KEY)
            .and_then(|v| v.as_bool())
            .unwrap_or(false)
    }

    fn link(&self) -> Option<Arc<Link>> {
        lock(&self.link).as_ref().map(|(_, l, _)| l.clone())
    }

    fn drop_link(&self) {
        if let Some((_, l, _)) = lock(&self.link).take() {
            l.close();
        }
    }

    /// Reads everything, then shows it as one change. A value the buds won't report is left as it was.
    fn read_all(&self, l: &Link) -> Result<(), LinkError> {
        fn known<T>(r: Result<T, LinkError>) -> Result<Option<T>, LinkError> {
            match r {
                Ok(v) => Ok(Some(v)),
                Err(LinkError::Lost) => Err(LinkError::Lost),
                Err(_) => Ok(None),
            }
        }
        let now = known(l.charge())?;
        let places = known(l.places())?;
        // The primary bud answers "off" whenever it isn't in an ear, so that isn't knowledge.
        let mode = known(l.mode())?
            .filter(|m| *m != Mode::Off || places.is_none_or(|p| p[0] != Place::Out));
        let name = known(l.name())?;
        if now.is_some_and(|r| r.battery.incomplete()) {
            let _ = self.wake.send(Wake::Incomplete);
        }
        self.update(|b| {
            b.status = Status::Connected;
            if let Some(r) = now {
                charge(b, r);
            }
            b.mode = mode.or(b.mode);
            b.name = name.or(b.name.take());
        });
        Ok(())
    }

    /// True while a bud's level is still missing.
    fn ask_again(&self) -> bool {
        let Some(Ok(r)) = self.link().map(|l| l.charge()) else {
            return false;
        };
        self.update(|b| charge(b, r));
        r.battery.incomplete()
    }

    /// Sets the mode and waits for the buds to announce it; puts the old one back if they don't.
    fn set_mode(&self, m: Mode) -> Result<(), LinkError> {
        let l = self.link().ok_or(LinkError::Lost)?;
        let before = self.snapshot().mode;
        *lock(&self.wanted) = Some(m);
        *lock(&self.announced) = None;
        self.update(|b| b.mode = Some(m));
        let done = l.set_mode(m).and_then(|()| {
            if before == Some(m) {
                return Ok(()); // nothing changes, so nothing is announced
            }
            let until = Instant::now() + MODE_CONFIRM;
            while *lock(&self.announced) != Some(m) {
                if *lock(&self.wanted) != Some(m) {
                    return Ok(()); // replaced by a newer choice
                }
                if Instant::now() > until {
                    return Err(LinkError::Ignored);
                }
                std::thread::sleep(Duration::from_millis(40));
            }
            Ok(())
        });
        // A newer choice may have replaced this one; leave that alone.
        let mut wanted = lock(&self.wanted);
        if *wanted == Some(m) {
            *wanted = None;
            drop(wanted);
            if done.is_err() {
                self.update(|b| b.mode = before);
            }
        }
        done
    }

    fn on_event(&self, e: Event) {
        match e {
            Event::Notify(op::MODE_NOTIFY, p) => {
                let Some(m) = parse_mode(&p) else { return };
                *lock(&self.announced) = Some(m);
                // While a change is under way, announcements of other modes are out of date.
                if lock(&self.wanted).is_some_and(|w| w != m) {
                    return;
                }
                self.update(|b| b.mode = Some(m));
            }
            Event::Notify(op::BATTERY_NOTIFY, p) => {
                let mut r = parse_report(&p);
                // Believe a swap of sides only if the buds say it again when asked.
                let doubt = r.seats.is_some_and(|s| s.swaps(lock(&self.buds).in_case));
                if doubt {
                    r.seats = None;
                }
                self.update(|b| charge(b, r));
                if doubt || r.battery.incomplete() {
                    let _ = self.wake.send(Wake::Incomplete);
                }
            }
            Event::Notify(..) => {}
            Event::Closed => {
                let _ = self.wake.send(Wake::Closed);
            }
        }
    }

    fn run(self: &Arc<Self>, woken: &Receiver<Wake>) {
        unsafe {
            let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
        }
        let _watchers = watcher::watch(&self.wake);
        let mut was_connected = false;
        let mut lost = None::<Instant>;
        let (mut opens, mut asking) = (0, MAX_ASKS);
        let mut wait = Duration::ZERO;
        loop {
            match woken.recv_timeout(wait) {
                Ok(Wake::Incomplete) => {
                    wait = ASK_AGAIN;
                    asking = 0;
                    continue;
                }
                // Windows reports one change as a burst of events; let it settle briefly.
                Ok(Wake::Windows) => {
                    std::thread::sleep(Duration::from_millis(80));
                    while woken.try_recv().is_ok() {}
                }
                Ok(_) | Err(RecvTimeoutError::Timeout) => {}
                Err(RecvTimeoutError::Disconnected) => return,
            }
            if !self.enabled() {
                self.drop_link();
                was_connected = false;
                self.update(|b| *b = Buds::default());
                wait = IDLE;
                continue;
            }
            wait = Duration::from_secs(30); // safety net if Windows misses an event
            let app_running = !super::process::processes_named("fitswise").is_empty();
            self.update(|b| b.app_running = app_running);

            let status = match watcher::presence() {
                Presence::Connected(address) => {
                    lost = None;
                    if !was_connected {
                        was_connected = true;
                        opens = 0;
                        self.update(|b| b.status = Status::Connecting);
                    }
                    if !self.ensure_link(address, &mut opens) {
                        if opens < MAX_OPENS {
                            wait = RETRY; // presence is checked again before the next attempt
                        } else if app_running {
                            wait = IDLE; // try again once the app lets go
                            opens = 0;
                        }
                    } else if asking < MAX_ASKS && self.ask_again() {
                        asking += 1;
                        wait = ASK_AGAIN;
                    }
                    continue;
                }
                Presence::BluetoothOff => Status::BluetoothOff,
                Presence::NotPaired => Status::NotPaired,
                Presence::Unsupported => Status::Unsupported,
                Presence::Disconnected => Status::Disconnected,
            };
            self.drop_link();
            opens = 0;
            if was_connected && status == Status::Disconnected {
                let since = lost.get_or_insert_with(Instant::now).elapsed();
                if since < GRACE {
                    wait = GRACE - since;
                    continue; // nothing on screen changes yet
                }
            }
            lost = None;
            was_connected = false;
            self.update(|b| {
                if status == Status::Disconnected {
                    b.status = status;
                    b.in_case = InCase::default();
                    b.battery = Battery::default().after(b.battery, b.in_case);
                } else {
                    *b = Buds {
                        status,
                        app_running,
                        ..Buds::default()
                    };
                }
            });
        }
    }

    fn ensure_link(self: &Arc<Self>, address: u64, opens: &mut u32) -> bool {
        if let Some((a, l, since)) = &*lock(&self.link) {
            if *a == address && l.is_open() {
                return true;
            }
            if since.elapsed() > HEALTHY {
                *opens = 0;
            }
        }
        self.drop_link();
        if *opens >= MAX_OPENS {
            self.update(|b| b.status = Status::Silent);
            return false;
        }
        *opens += 1;
        let me = Arc::downgrade(self);
        let opened = Link::open(address, move |e| {
            if let Some(c) = me.upgrade() {
                c.on_event(e);
            }
        });
        // A failed attempt shows nothing: the next one is seconds away, and giving up is shown above.
        opened.is_ok_and(|l| {
            let l = Arc::new(l);
            let read = self.read_all(&l).is_ok();
            if read {
                *lock(&self.link) = Some((address, l, Instant::now()));
            }
            read
        })
    }
}

fn charge(b: &mut Buds, r: Report) {
    b.in_case = r.seats.unwrap_or(b.in_case);
    b.case_open = r.case_open.unwrap_or(b.case_open);
    b.battery = r.battery.after(b.battery, b.in_case);
    if !b.case_open
        && let Some(c) = &mut b.battery.case
    {
        c.stale = true; // a shut case can't report; this is its level from before
    }
}

#[derive(Default)]
pub struct FitswiseProvider {
    ctx: Mutex<Option<Arc<Ctx>>>,
}

impl Provider for FitswiseProvider {
    fn id(&self) -> &'static str {
        ID
    }

    fn start(self: Arc<Self>, hub: Arc<Hub>) {
        let (wake, woken) = channel();
        let ctx = Arc::new(Ctx {
            hub,
            buds: Mutex::default(),
            link: Mutex::default(),
            wanted: Mutex::default(),
            announced: Mutex::default(),
            wake,
        });
        ctx.update(|_| {});
        *lock(&self.ctx) = Some(ctx.clone());
        std::thread::spawn(move || ctx.run(&woken));
    }

    fn action(&self, action: &str, payload: Value) -> Result<Value, String> {
        let ctx = lock(&self.ctx).clone().ok_or("fitswise not started")?;
        match action {
            "mode" => {
                let m: Mode = serde_json::from_value(payload).map_err(|e| e.to_string())?;
                ctx.set_mode(m).map_err(|e| e.to_string())?;
            }
            // The module was switched on or off: look now instead of within `IDLE`.
            "refresh" => {
                let _ = ctx.wake.send(Wake::Windows);
            }
            _ => return Err(format!("{ID}: unknown action '{action}'")),
        }
        Ok(Value::Null)
    }
}
