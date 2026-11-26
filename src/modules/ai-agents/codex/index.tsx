/**
 * OpenAI Codex agent. Backend: `src-tauri/src/providers/codex/`.
 */
import { providerAction } from "../../../core/bridge";
import type { AgentDefinition } from "../common/types";
import { CodexIcon } from "./CodexIcon";
import { CodexSettings } from "./CodexSettings";
import { useCodex } from "./useCodex";

export const codexAgent: AgentDefinition = {
	id: "codex",
	name: "Codex",
	// Electric Indigo, between Periwinkle Lavender and Vivid Cobalt Blue, over Pale Mist Blue.
	color: "#6866F9",
	gradient: { light: "#9E8BFF", deep: "#3A4DF2", tint: "#C7D6FF" },
	Icon: CodexIcon,
	iconAnimates: true,
	useAgent: useCodex,
	usageUrl: "https://chatgpt.com/codex/settings/usage",
	openApp: () => providerAction("codex", "openApp"),
	openSession: (session) => {
		if (session.cwd) providerAction("codex", "openProject", session.cwd);
	},
	SettingsSection: CodexSettings,
};
