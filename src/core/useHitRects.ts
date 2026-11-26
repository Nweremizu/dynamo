import { useEffect } from "react";
import { command, isTauri } from "./bridge";
import { whileMoving } from "./whileMoving";

const PAD = 6;
/** The backend's hit-test thread reads the rects this often (`spawn_hit_test`); sending more is wasted. */
const SEND_EVERY_MS = 25;

/**
 * Keeps the backend informed about which parts of the transparent window are
 * interactive. Every element marked with `data-hit` counts; the rects follow
 * animations because they are re-measured while anything moves, as often as
 * the backend looks at them (each send is an IPC call).
 */
export function useHitRects() {
	useEffect(() => {
		if (!isTauri) return;
		let last = "";
		let lastAt = 0;
		let pending = false;
		let changed = true;

		const measure = () => {
			pending = false;
			const rects = Array.from(document.querySelectorAll<HTMLElement>("[data-hit]")).map((el) => {
				const r = el.getBoundingClientRect();
				return {
					x: Math.round(r.left - PAD),
					y: Math.round(Math.max(0, r.top - PAD)),
					width: Math.round(r.width + PAD * 2),
					height: Math.round(r.height + PAD * 2),
				};
			});
			const key = JSON.stringify(rects);
			changed = key !== last;
			if (!changed) return;
			last = key;
			command("set_hit_rects", { rects });
		};

		return whileMoving("[data-hit]", () => {
			const now = performance.now();
			if (!pending && now - lastAt >= SEND_EVERY_MS) {
				pending = true;
				lastAt = now;
				// After this frame has rendered: measured inside the frame, right after Motion's
				// writes, every read forced a second layout. A frame late is fine for hit testing.
				setTimeout(measure);
			}
			// What the last measure saw, so settling still counts still frames.
			return changed;
		});
	}, []);
}
