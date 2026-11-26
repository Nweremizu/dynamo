/**
 * Structured data (JSON-LD) for search engines and AI answer engines, built
 * from the same strings the pages show so the two never disagree. Rendered
 * into the static HTML (see `Base.astro`), not injected by JavaScript.
 */
import pkg from "../../package.json";
import { DOWNLOAD, LINKS, REPO, type Lang, href, strings } from "./i18n";

type Json = Record<string, unknown>;

const LICENSE = "https://www.gnu.org/licenses/gpl-3.0.html";

/** The site and the people behind it: one node each, referenced by id. */
function identity(site: URL, lang: Lang): Json[] {
	const home = new URL(href(lang), site).href;
	return [
		{
			"@type": "WebSite",
			"@id": `${new URL("/", site).href}#website`,
			url: home,
			name: "Dynamo",
			alternateName: "Dynamic Island for Windows",
			inLanguage: strings[lang].htmlLang,
			publisher: { "@id": `${new URL("/", site).href}#project` },
		},
		{
			"@type": "Organization",
			"@id": `${new URL("/", site).href}#project`,
			name: "Dynamo",
			url: new URL("/", site).href,
			sameAs: [REPO],
		},
	];
}

/** The home page: the app itself, and the questions answered on the page. */
export function homeGraph(site: URL, lang: Lang, image: string, screenshots: string[]): Json {
	const t = strings[lang];
	const page = new URL(href(lang), site).href;
	return {
		"@context": "https://schema.org",
		"@graph": [
			...identity(site, lang),
			{
				"@type": "SoftwareApplication",
				"@id": `${new URL("/", site).href}#app`,
				name: "Dynamo",
				alternateName: ["Dynamic Island for Windows", "Dynamo Island"],
				description: t.meta.description,
				url: page,
				applicationCategory: "UtilitiesApplication",
				applicationSubCategory: "Desktop enhancement",
				operatingSystem: "Windows 10, Windows 11",
				softwareVersion: pkg.version,
				downloadUrl: DOWNLOAD,
				installUrl: DOWNLOAD,
				releaseNotes: LINKS.releases,
				license: LICENSE,
				isAccessibleForFree: true,
				offers: { "@type": "Offer", price: "0", priceCurrency: "USD", availability: "https://schema.org/InStock" },
				image,
				screenshot: screenshots,
				featureList: Object.values(t.modules.tiles).map((tile) => tile.title),
				inLanguage: ["en", "pt-BR", "zh-CN"],
				author: { "@id": `${new URL("/", site).href}#project` },
				codeRepository: REPO,
			},
			{
				"@type": "FAQPage",
				"@id": `${page}#faq`,
				url: page,
				inLanguage: t.htmlLang,
				mainEntity: t.faq.items.map(([question, answer]) => ({
					"@type": "Question",
					name: question,
					acceptedAnswer: { "@type": "Answer", text: answer },
				})),
			},
		],
	};
}

/** The privacy policy: a page under the home page. */
export function privacyGraph(site: URL, lang: Lang): Json {
	const t = strings[lang];
	const home = new URL(href(lang), site).href;
	const page = new URL(href(lang, "privacy"), site).href;
	return {
		"@context": "https://schema.org",
		"@graph": [
			...identity(site, lang),
			{
				"@type": "WebPage",
				"@id": page,
				url: page,
				name: t.meta.privacyTitle,
				description: t.meta.privacyDescription,
				inLanguage: t.htmlLang,
				isPartOf: { "@id": `${new URL("/", site).href}#website` },
			},
			{
				"@type": "BreadcrumbList",
				itemListElement: [
					{ "@type": "ListItem", position: 1, name: "Dynamo", item: home },
					{ "@type": "ListItem", position: 2, name: t.meta.privacyTitle, item: page },
				],
			},
		],
	};
}
