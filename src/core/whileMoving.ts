/**
 * Runs `tick` every animation frame, but only while the island is moving.
 *
 * An endless `requestAnimationFrame` loop makes the webview draw a frame on
 * every vsync even with nothing on screen changing (measured: about half a CPU
 * core between the renderer and GPU processes at rest). This one stops once
 * `tick` has reported no change for a few frames, and wakes up when an element
 * matching `selector` (or one holding such an element) changes its style or
 * class, such an element comes or goes, or the window resizes. That covers Motion's
 * springs, which write `style` every frame.
 *
 * `tick` returns true when what it measured changed.
 */
const SETTLE_FRAMES = 20;

export function whileMoving(selector: string, tick: () => boolean): () => void {
	let raf = 0;
	let still = 0;

	const loop = () => {
		raf = 0;
		still = tick() ? 0 : still + 1;
		if (still < SETTLE_FRAMES) raf = requestAnimationFrame(loop);
	};
	const wake = () => {
		still = 0;
		if (!raf) raf = requestAnimationFrame(loop);
	};

	const relevant = (node: Node) =>
		node instanceof Element && (node.matches(selector) || node.querySelector(selector) !== null);
	const observer = new MutationObserver((records) => {
		for (const r of records) {
			// An element joining or leaving the outline (it may no longer match `selector`).
			if (r.attributeName?.startsWith("data-")) return wake();
			const changed = r.type === "childList" ? [...r.addedNodes, ...r.removedNodes] : [r.target];
			if (changed.some(relevant)) return wake();
		}
	});
	observer.observe(document.body, {
		subtree: true,
		childList: true,
		attributes: true,
		attributeFilter: ["style", "class", "data-hit", "data-glass", "data-glass-off"],
	});
	window.addEventListener("resize", wake);
	wake();

	return () => {
		cancelAnimationFrame(raf);
		observer.disconnect();
		window.removeEventListener("resize", wake);
	};
}
