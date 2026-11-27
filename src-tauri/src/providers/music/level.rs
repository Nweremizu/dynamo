//! Live output level for the visualizer.
//!
//! Players don't always render to the default device (Spotify, for one, can
//! pick its own), and the endpoint meter may sit near zero while the app's own
//! session is loud. So we read the peak of every *active* audio session on
//! every active output device and use the loudest one.

use std::sync::{Arc, Condvar, Mutex};
use std::time::Duration;

use windows::Win32::Media::Audio::Endpoints::IAudioMeterInformation;
use windows::Win32::Media::Audio::{
    AudioSessionStateActive, DEVICE_STATE_ACTIVE, IAudioSessionManager2, IMMDeviceEnumerator,
    MMDeviceEnumerator, eRender,
};
use windows::Win32::System::Com::{
    CLSCTX_ALL, COINIT_MULTITHREADED, CoCreateInstance, CoInitializeEx,
};
use windows::core::{Interface, Result};

use super::LEVEL_EVENT;
use crate::hub::Hub;

const FRAME: Duration = Duration::from_millis(33);
/// Below the threshold the visualizer displays dots.
const SILENCE: f32 = 0.004;
/// Re-scan sessions about once a second (they come and go).
const RESCAN_EVERY: u32 = 30;

#[derive(Default)]
pub struct Meter {
    activity: Mutex<Activity>,
    changed: Condvar,
}

#[derive(Default)]
struct Activity {
    playing: bool,
    visible: bool,
}

impl Activity {
    fn active(&self) -> bool {
        self.playing && self.visible
    }
}

impl Meter {
    pub(super) fn set_playing(&self, playing: bool) {
        self.update(|state| state.playing = playing);
    }

    pub(super) fn set_visible(&self, visible: bool) {
        self.update(|state| state.visible = visible);
    }

    fn update(&self, update: impl FnOnce(&mut Activity)) {
        let mut activity = self.activity.lock().unwrap();
        let was_active = activity.active();
        update(&mut activity);
        if activity.active() != was_active {
            self.changed.notify_one();
        }
    }
}

pub fn level_loop(hub: Arc<Hub>, meter: Arc<Meter>) {
    unsafe {
        let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
    }
    loop {
        drop(
            meter
                .changed
                .wait_while(meter.activity.lock().unwrap(), |state| !state.active())
                .unwrap(),
        );
        let mut meters = Vec::new();
        let mut tick = 0u32;
        let mut was_silent = true;
        loop {
            if tick.is_multiple_of(RESCAN_EVERY) {
                meters = active_session_meters().unwrap_or_default();
            }
            tick = tick.wrapping_add(1);

            let level = meters
                .iter()
                .filter_map(|m| unsafe { m.GetPeakValue() }.ok())
                .fold(0.0f32, f32::max);
            let silent = level < SILENCE;
            if !silent || !was_silent {
                hub.transient(LEVEL_EVENT, if silent { 0.0 } else { level });
            }
            was_silent = silent;
            let (state, _) = meter
                .changed
                .wait_timeout_while(meter.activity.lock().unwrap(), FRAME, |state| {
                    state.active()
                })
                .unwrap();
            if !state.active() {
                break;
            }
        }
    }
}

fn active_session_meters() -> Result<Vec<IAudioMeterInformation>> {
    let mut meters = Vec::new();
    unsafe {
        let enumerator: IMMDeviceEnumerator =
            CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL)?;
        let devices = enumerator.EnumAudioEndpoints(eRender, DEVICE_STATE_ACTIVE)?;
        for i in 0..devices.GetCount()? {
            let Ok(device) = devices.Item(i) else {
                continue;
            };
            let Ok(manager) = device.Activate::<IAudioSessionManager2>(CLSCTX_ALL, None) else {
                continue;
            };
            let Ok(sessions) = manager.GetSessionEnumerator() else {
                continue;
            };
            for j in 0..sessions.GetCount().unwrap_or(0) {
                let Ok(session) = sessions.GetSession(j) else {
                    continue;
                };
                if session.GetState().ok() != Some(AudioSessionStateActive) {
                    continue;
                }
                if let Ok(meter) = session.cast::<IAudioMeterInformation>() {
                    meters.push(meter);
                }
            }
        }
    }
    Ok(meters)
}

#[cfg(test)]
mod tests {
    use super::Meter;

    #[test]
    fn samples_only_when_playing_and_visible() {
        let meter = Meter::default();
        let active = || meter.activity.lock().unwrap().active();
        assert!(!active());
        meter.set_playing(true);
        assert!(!active());
        meter.set_visible(true);
        assert!(active());
        meter.set_playing(false);
        assert!(!active());
        meter.set_playing(true);
        meter.set_visible(false);
        assert!(!active());
    }
}
