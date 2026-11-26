import { defineConfig } from "astro/config";

export default defineConfig({
	// GitHub Pages for Nweremizu/dynamo; with a custom domain, set `site` to it and drop `base`.
	site: "https://nweremizu.github.io",
	base: "/dynamo",
	trailingSlash: "ignore",
	i18n: {
		defaultLocale: "en",
		locales: ["en", "pt-br"],
		routing: { prefixDefaultLocale: false },
	},
	vite: {
		// Screenshots, the app icon and the privacy policy live in the repo root.
		server: { fs: { allow: [".."] } },
	},
});
