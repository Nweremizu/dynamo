/**
 * Privacy — which apps are using the microphone or the camera, like the
 * orange and green dots on the iPhone. The dot stays on the island's left
 * while anything listens or watches; a new app starting peeks once.
 * Backend: `src-tauri/src/providers/privacy.rs`.
 */
import { MicIcon, ShieldIcon, VideoIcon } from "lucide-react";
import { useRef } from "react";
import { useProvider } from "../../core/bridge";
import { useT } from "../../core/i18n";
import type { IslandModule, ModuleView } from "../../core/types";

/** Mirrors `State` in `privacy.rs`. */
interface PrivacyApp {
	name: string;
	icon: string | null;
}
interface PrivacyState {
	mic: PrivacyApp[];
	camera: PrivacyApp[];
}

const MIC = "#FF9F0A";
const CAMERA = "#30D158";
const ROW = 46;

type Use = { app: PrivacyApp; kind: "mic" | "camera" };

function Dot({ color }: { color: string }) {
	return (
		<span className="size-2 flex-none rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
	);
}

function PrivacyPanel({ uses }: { uses: Use[] }) {
	const t = useT();
	return (
		<ul className="flex h-full list-none flex-col gap-1 overflow-y-auto pt-1 [scrollbar-width:none]" data-scroll>
			{uses.map(({ app, kind }) => (
				<li key={`${kind}:${app.name}`} className="flex h-10.5 flex-none items-center gap-3 rounded-xl bg-white/6 px-3">
					{app.icon ? (
						<img src={app.icon} alt="" className="size-6 flex-none" draggable={false} />
					) : (
						<span className="grid size-6 flex-none place-items-center rounded-md bg-white/10 text-[11px] font-bold">
							{app.name.slice(0, 1)}
						</span>
					)}
					<span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{app.name}</span>
					<span
						className="flex flex-none items-center gap-1.5 text-[12px] font-semibold"
						style={{ color: kind === "mic" ? MIC : CAMERA }}
					>
						{kind === "mic" ? <MicIcon size={14} aria-hidden /> : <VideoIcon size={14} aria-hidden />}
						{t(kind === "mic" ? "privacy.mic" : "privacy.camera")}
					</span>
				</li>
			))}
		</ul>
	);
}

export const privacyModule: IslandModule = {
	id: "privacy",
	title: "privacy.title",
	settingsIcon: <ShieldIcon size={15} />,
	useView(): ModuleView {
		const t = useT();
		const state = useProvider<PrivacyState>("privacy");
		const uses: Use[] = [
			...(state?.camera ?? []).map((app) => ({ app, kind: "camera" as const })),
			...(state?.mic ?? []).map((app) => ({ app, kind: "mic" as const })),
		];
		const camera = !!state?.camera.length;
		const color = camera ? CAMERA : MIC;
		const first = uses[0];

		// Counts apps starting, so the island peeks for a new one but not when one stops.
		const seen = useRef({ keys: new Set<string>(), starts: 0 });
		const keys = new Set(uses.map((u) => `${u.kind}:${u.app.name}`));
		if ([...keys].some((k) => !seen.current.keys.has(k))) seen.current.starts++;
		seen.current.keys = keys;

		return {
			// Low priority: the dot on the left is the real indicator; the pill only shows when nothing else does.
			active: !!first,
			priority: 15,
			hidden: !first,
			accent: color,
			icon: camera ? <VideoIcon size={14} color={CAMERA} /> : <MicIcon size={14} color={MIC} />,
			ambient: first ? <Dot color={color} /> : undefined,
			compact: first
				? {
						left: (
							<span className="flex min-w-0 items-center gap-2 text-[13px] font-semibold">
								<Dot color={color} />
								<span className="truncate">{first.app.name}</span>
							</span>
						),
						right: (
							<span className="text-[12.5px] font-semibold whitespace-nowrap" style={{ color }}>
								{t(first.kind === "mic" ? "privacy.mic" : "privacy.camera")}
							</span>
						),
						width: 270,
					}
				: undefined,
			expanded: <PrivacyPanel uses={uses} />,
			expandedSize: { width: 560, height: 30 + Math.min(Math.max(uses.length, 1), 4) * ROW },
			activityKey: seen.current.starts ? `start:${seen.current.starts}` : undefined,
		};
	},
};
