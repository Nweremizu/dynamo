import type { APIRoute } from "astro";
import social from "../../../docs/social-preview.png";
import agents from "../assets/shots/agents.png";
import music from "../assets/shots/music.png";
import notifications from "../assets/shots/notifications.png";
import { href, strings } from "../i18n";

/** Every indexable page; the home page lists its main pictures for image search. */
export const GET: APIRoute = ({ site }) => {
	const t = strings.en;
	const at = (path: string) => new URL(path, site).href;
	const today = new Date().toISOString().slice(0, 10);
	const images = [
		[social.src, t.meta.imageAlt],
		[agents.src, t.modules.tiles.agents.alt],
		[music.src, t.modules.tiles.music.alt],
		[notifications.src, t.modules.tiles.notifications.alt],
	]
		.map(([src, title]) => `<image:image><image:loc>${at(src)}</image:loc><image:title>${escape(title)}</image:title></image:image>`)
		.join("");
	const pages = [
		`<url><loc>${at(href("en"))}</loc><lastmod>${today}</lastmod>${images}</url>`,
		`<url><loc>${at(href("en", "privacy"))}</loc><lastmod>${today}</lastmod></url>`,
	];
	return new Response(
		`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${pages.join("")}</urlset>\n`,
		{ headers: { "Content-Type": "application/xml; charset=utf-8" } },
	);
};

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
