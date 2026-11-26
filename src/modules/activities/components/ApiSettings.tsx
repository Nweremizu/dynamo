import { TerminalIcon } from "lucide-react";
import { Block, Desc, Row, Section } from "../../../components/ui/card";
import { Status } from "../../../components/ui/status";
import { Code } from "../../../components/ui/text";
import { Tile } from "../../../components/ui/tile";
import { useProvider } from "../../../core/bridge";
import { useT } from "../../../core/i18n";
import { ACTIVITIES_PROVIDER, type ActivitiesState } from "../types";

/** Where the local API listens, with a ready-to-paste example. */
export function ApiSettings() {
	const t = useT();
	const state = useProvider<ActivitiesState>(ACTIVITIES_PROVIDER);
	const port = state?.apiPort;
	const example = `curl -X POST http://127.0.0.1:${port ?? 5199}/notify -H "Content-Type: application/json" -d "{\\"title\\":\\"Deploy done\\",\\"icon\\":\\"check\\",\\"color\\":\\"#30D158\\"}"`;
	return (
		<Section>
			<Block>
				<Row
					icon={
						<Tile tone="linear-gradient(180deg, #4a4a50, #2a2a2e)">
							<TerminalIcon />
						</Tile>
					}
					label={t("activities.server.title")}
					desc={t("activities.server.desc")}
				>
					<Status tone={port ? "ok" : "off"}>{port ? `127.0.0.1:${port}` : t("activities.server.down")}</Status>
				</Row>
				<Code>{example}</Code>
				<Desc>{t("activities.server.routes")}</Desc>
			</Block>
		</Section>
	);
}
