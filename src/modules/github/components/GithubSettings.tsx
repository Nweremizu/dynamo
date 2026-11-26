import { BookMarkedIcon, CircleDotIcon, ExternalLinkIcon, XIcon } from "lucide-react";
import { type FormEvent, useState } from "react";
import { GitHubIcon } from "../../../components/icons";
import { Button, IconButton, LinkButton } from "../../../components/ui/button";
import { Block, Desc, List, ListItem, Row, Section } from "../../../components/ui/card";
import { Input } from "../../../components/ui/form";
import { Tile } from "../../../components/ui/tile";
import { providerAction, useProvider } from "../../../core/bridge";
import { useT } from "../../../core/i18n";
import { setSetting, useSetting } from "../../../core/settings";
import { formatCount, parseRepo } from "../repo";
import { githubRepos } from "../settings";
import type { GithubState } from "../types";

const TOKEN_URL = "https://github.com/settings/tokens/new?scopes=repo&description=Dynamic%20Island";

/** Followed repositories + GitHub account, for the settings window. */
export function GithubSettings() {
	return (
		<>
			<Section>
				<Repos />
			</Section>
			<Section>
				<Account />
			</Section>
		</>
	);
}

function Repos() {
	const t = useT();
	const state = useProvider<GithubState>("github");
	const repos = useSetting(githubRepos);
	const [input, setInput] = useState("");
	const [error, setError] = useState<string | null>(null);

	const add = (e: FormEvent) => {
		e.preventDefault();
		const name = parseRepo(input);
		if (!name) return setError(t("github.repos.invalid"));
		if (repos.some((r) => r.toLowerCase() === name.toLowerCase())) return setError(t("github.repos.duplicate"));
		setSetting(githubRepos, [...repos, name]);
		setInput("");
		setError(null);
	};

	return (
		<Block>
			<Row
				icon={
					<Tile>
						<BookMarkedIcon />
					</Tile>
				}
				label={t("github.repos.title")}
				desc={t("github.repos.desc")}
			/>
			<form className="flex gap-2" onSubmit={add}>
				<Input
					className="flex-1"
					value={input}
					placeholder={t("github.repos.placeholder")}
					aria-label={t("github.repos.placeholder")}
					spellCheck={false}
					onChange={(e) => {
						setInput(e.target.value);
						setError(null);
					}}
				/>
				<Button type="submit" variant="primary" disabled={!input.trim()}>
					{t("github.repos.add")}
				</Button>
			</form>
			{error && <Desc tone="error">{error}</Desc>}
			{repos.length > 0 && (
				<List>
					{repos.map((name) => {
						const repo = state?.repos.find((r) => r.name.toLowerCase() === name.toLowerCase());
						return (
							<ListItem key={name} name={name}>
								{repo?.error ? (
									<span className="flex items-center gap-1 text-[12px] font-medium text-destructive-foreground">
										{t(`github.error.${repo.error}`)}
									</span>
								) : (
									repo?.issues?.count != null && (
										<span className="flex items-center gap-1 text-[12px] font-semibold text-success-foreground tabular-nums">
											<CircleDotIcon aria-hidden size={12} />
											{formatCount(repo.issues.count)}
										</span>
									)
								)}
								<IconButton
									size="sm"
									tone="danger"
									title={t("github.repos.remove")}
									aria-label={`${t("github.repos.remove")}: ${name}`}
									onClick={() =>
										setSetting(
											githubRepos,
											repos.filter((r) => r !== name),
										)
									}
								>
									<XIcon size={12} />
								</IconButton>
							</ListItem>
						);
					})}
				</List>
			)}
		</Block>
	);
}

function Account() {
	const t = useT();
	const state = useProvider<GithubState>("github");
	const [token, setToken] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const run = async (action: "setToken" | "clearToken", payload?: unknown) => {
		setBusy(true);
		setError(null);
		try {
			await providerAction("github", action, payload);
			setToken("");
		} catch (e) {
			const code = String(e);
			setError(code === "unauthorized" ? t("github.error.unauthorized") : code);
		} finally {
			setBusy(false);
		}
	};

	const login = state?.login ?? "…";
	const status = state?.authError
		? t("github.account.rejected")
		: state?.auth === "token"
			? t("github.account.token", { login })
			: state?.auth === "gh"
				? t("github.account.gh", { login })
				: t("github.account.none");

	return (
		<Block>
			<Row
				icon={
					<Tile tone="linear-gradient(180deg, #3d444d, #1f2328)">
						<GitHubIcon />
					</Tile>
				}
				label={t("github.account.title")}
				desc={status}
				descTone={state?.authError ? "warn" : undefined}
			>
				{state?.auth === "token" && (
					<Button variant="danger" loading={busy} onClick={() => run("clearToken")}>
						{t("github.account.remove")}
					</Button>
				)}
			</Row>
			{state?.auth !== "token" && (
				<>
					<form
						className="flex gap-2"
						onSubmit={(e) => {
							e.preventDefault();
							run("setToken", { token });
						}}
					>
						<Input
							className="flex-1"
							type="password"
							value={token}
							placeholder={t("github.account.placeholder")}
							aria-label={t("github.account.placeholder")}
							autoComplete="off"
							spellCheck={false}
							onChange={(e) => setToken(e.target.value)}
						/>
						<Button type="submit" variant="primary" loading={busy} disabled={!token.trim()}>
							{t("github.account.save")}
						</Button>
					</form>
					<Desc>
						{t("github.account.stored")}{" "}
						<LinkButton
							className="inline-flex items-center gap-0.5"
							onClick={() => providerAction("github", "open", { url: TOKEN_URL })}
						>
							{t("github.account.create")}
							<ExternalLinkIcon aria-hidden size={12} />
						</LinkButton>
					</Desc>
				</>
			)}
			{error && <Desc tone="error">{error}</Desc>}
		</Block>
	);
}
