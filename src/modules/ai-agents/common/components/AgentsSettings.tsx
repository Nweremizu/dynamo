import { Collapsible } from "../../../../components/ui/card";
import { Tile } from "../../../../components/ui/tile";
import type { AgentDefinition } from "../types";

/** An agent's tile: its brand gradient, or its color lit from the top. */
const toneOf = (a: AgentDefinition) =>
	a.gradient
		? `linear-gradient(180deg, ${a.gradient.light}, ${a.color} 55%, ${a.gradient.deep})`
		: `linear-gradient(180deg, color-mix(in oklab, ${a.color} 78%, white), ${a.color})`;

/** Each agent's settings folded under its own name, its icon on a tile in its colors. */
export function AgentsSettings({ agents }: { agents: AgentDefinition[] }) {
	return (
		<>
			{agents.map(
				(a) =>
					a.SettingsSection && (
						<Collapsible
							key={a.id}
							title={a.name}
							icon={
								<Tile tone={toneOf(a)}>
									<a.Icon size={15} />
								</Tile>
							}
						>
							<a.SettingsSection />
						</Collapsible>
					),
			)}
		</>
	);
}
