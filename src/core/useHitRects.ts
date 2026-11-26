import { useEffect } from "react";
import { command, isTauri } from "./bridge";
import { whileMoving } from "./whileMoving";

const PAD = 6;

/**
 * Keeps the backend informed about which parts of the transparent window are
 * interactive. Every element marked with `data-hit` counts; the rects follow
 * animations because they are re-measured every frame while anything moves.
 */
export function useHitRects() {
	useEffect(() => {
		if (!isTauri) return;
		let last = "";
		return whileMoving("[data-hit]", () => {
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
			if (key === last) return false;
			last = key;
			command("set_hit_rects", { rects });
			return true;
		});
	}, []);
}
