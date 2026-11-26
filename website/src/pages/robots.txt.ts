import type { APIRoute } from "astro";

// Everyone may crawl, AI answer engines included: being cited there is how many people find apps now.
export const GET: APIRoute = ({ site }) =>
	new Response(`User-agent: *\nAllow: /\n\nSitemap: ${new URL("/sitemap.xml", site)}\n`, {
		headers: { "Content-Type": "text/plain; charset=utf-8" },
	});
