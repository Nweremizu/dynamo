import { defineConfig } from "astro/config";

// The address every canonical URL, the sitemap, robots.txt and the structured
// data point to. Cloudflare: a build variable on the Worker (its *.workers.dev
// address, or a custom domain later). A wrong one quietly sends search engines
// elsewhere, so CI refuses to build without it.
if (process.env.CI && !process.env.SITE_URL) {
	throw new Error("Set the SITE_URL build variable to the site's address, e.g. https://dynamo.<you>.workers.dev");
}

export default defineConfig({
	site: process.env.SITE_URL ?? "http://localhost:4321",
	// One URL per page: `/privacy/`, never `/privacy` (wrangler.jsonc redirects the slashless form).
	trailingSlash: "always",
	// The CSS is small: inline it, so the first paint waits on no extra round trip.
	build: { inlineStylesheets: "always" },
	vite: {
		// Screenshots, the app icon and the privacy policy live in the repo root.
		server: { fs: { allow: [".."] } },
	},
});
