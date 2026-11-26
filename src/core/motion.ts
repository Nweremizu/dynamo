/**
 * The island's motion vocabulary. Springs are described the way Apple does,
 * by `response` (seconds to get there) and `damping` (1 = no overshoot), and
 * turned into physics parameters: those keep the velocity when a spring is
 * re-targeted midway, which duration-based ones don't.
 */
export function spring(response: number, damping = 1) {
	const omega = (2 * Math.PI) / response;
	return { type: "spring" as const, stiffness: omega * omega, damping: 2 * damping * omega, mass: 1 };
}

/** The island growing: a hint of overshoot. */
export const OPEN = spring(0.36, 0.8);
/** Shrinking back and everything else that moves: settles without a bounce. */
export const SETTLE = spring(0.3);
/** Thrown along the top edge: carries the release velocity. */
export const GLIDE = spring(0.42, 0.82);
/** Small controls: presses, pills, toggles. */
export const SNAPPY = spring(0.28, 0.9);

/** How far past an edge `overshoot` px of drag shows: less and less, never more than `room`. */
export function rubberBand(overshoot: number, room = 140, give = 0.55) {
	return (overshoot * room * give) / (room + give * Math.abs(overshoot));
}
