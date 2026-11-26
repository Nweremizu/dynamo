import type { APIRoute } from "astro";
import { DOWNLOAD, LINKS, REPO, href, strings } from "../i18n";

/** A plain-text summary for AI answer engines (llmstxt.org), from the page's own words. */
export const GET: APIRoute = ({ site }) => {
	const t = strings.en;
	const tiles = Object.values(t.modules.tiles).map((tile) => `- ${tile.title}: ${tile.body}`);
	const more = t.modules.more.items.map(([name, desc]) => `- ${name}: ${desc}`);
	const faq = t.faq.items.map(([q, a]) => `### ${q}\n\n${a}`);
	const text = [
		"# Dynamo",
		`> ${t.meta.description}`,
		t.hero.lead,
		"## Features",
		[...tiles, ...more].join("\n"),
		"## Links",
		[
			`- [Download the latest release](${DOWNLOAD})`,
			`- [Source code on GitHub](${REPO})`,
			`- [Release notes](${LINKS.releases})`,
			`- [Writing plugins](${LINKS.plugins})`,
			`- [Local API](${LINKS.api})`,
			`- [Privacy policy](${new URL(href("en", "privacy"), site)})`,
		].join("\n"),
		"## FAQ",
		faq.join("\n\n"),
	].join("\n\n");
	return new Response(`${text}\n`, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
