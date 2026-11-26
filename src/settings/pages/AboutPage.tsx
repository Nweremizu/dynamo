import { ArrowUpRightIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { AppLogo, GitHubIcon } from "../../components/icons";
import { Button } from "../../components/ui/button";
import { Row, Section } from "../../components/ui/card";
import { command, isTauri } from "../../core/bridge";
import { useT } from "../../core/i18n";
import { useToolbarTitle } from "../components/toolbar";

const REPO_URL = "https://github.com/HeyyCzer/windows-island";

type UpdateStatus =
	| { state: "idle" | "checking" | "latest" | "dev" | "portable" | "store" | "error" }
	| { state: "ready"; version: string };

/** Manual update check; a found update is downloaded and installed on demand. */
function UpdateRow() {
	const t = useT();
	const [status, setStatus] = useState<UpdateStatus>({ state: "idle" });

	const check = async () => {
		setStatus({ state: "checking" });
		try {
			const version = await command<string | null>("check_update");
			setStatus(version ? { state: "ready", version } : { state: "latest" });
		} catch (e) {
			const known = e === "dev" || e === "portable" || e === "store";
			setStatus({ state: known ? (e as "dev" | "portable" | "store") : "error" });
		}
	};

	const desc =
		status.state === "ready"
			? t("settings.about.updates.ready", { version: status.version })
			: t(`settings.about.updates.${status.state}`);

	return (
		<Row
			label={t("settings.about.updates.label")}
			desc={<span role="status">{desc}</span>}
			descTone={status.state === "error" ? "error" : undefined}
		>
			{status.state === "ready" ? (
				<Button variant="primary" onClick={() => command("install_update")}>
					{t("settings.about.updates.install")}
				</Button>
			) : (
				<Button onClick={check} disabled={status.state === "checking"}>
					{t("settings.about.updates.check")}
				</Button>
			)}
		</Row>
	);
}

export function AboutPage() {
	const t = useT();
	const setTitle = useToolbarTitle();
	const title = t("settings.about.title");
	useEffect(() => setTitle(title), [setTitle, title]);
	const openRepo = () => (isTauri ? command("open_repo") : window.open(REPO_URL, "_blank"));

	return (
		<>
			{/* The app's card: its mark over a soft brand glow, name and version. */}
			<header
				data-page-header
				className="relative flex flex-col items-center gap-3 overflow-hidden rounded-2xl bg-(--settings-group) px-6 pt-9 pb-7 text-center shadow-[inset_0_0_0_1px_var(--hairline)]"
			>
				<div
					aria-hidden
					className="pointer-events-none absolute -top-24 left-1/2 size-72 -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--brand)_38%,transparent),transparent)]"
				/>
				<span className="relative [&_svg]:drop-shadow-[0_10px_28px_rgb(104_102_249/0.35)]">
					<AppLogo size={76} />
				</span>
				<div className="relative flex flex-col items-center gap-1.5">
					<h1 className="text-[24px]/[1.1] font-semibold tracking-[-0.02em]">Dynamo</h1>
					<span className="rounded-full bg-white/8 px-2.5 py-0.5 text-[12px] font-medium text-text-dim tabular-nums shadow-[inset_0_0_0_1px_var(--hairline)]">
						{t("settings.about.version", { version: __APP_VERSION__ })}
					</span>
				</div>
			</header>
			<Section>
				<UpdateRow />
				<Row
					label={t("settings.about.source")}
					desc={t("settings.about.basedOn", { project: "Island for Windows", author: "HeyyCzer" })}
				>
					<Button onClick={openRepo}>
						<GitHubIcon size={14} />
						GitHub
						<ArrowUpRightIcon aria-hidden className="-me-0.5 text-text-dim" />
					</Button>
				</Row>
				<Row label={t("settings.about.license")} desc="GNU GPL v3.0" />
			</Section>
		</>
	);
}
