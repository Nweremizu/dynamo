import type { APIRoute } from "astro";
import icon from "../../../src-tauri/icons/128x128@2x.png";
import { strings } from "../i18n";

export const GET: APIRoute = () =>
	new Response(
		JSON.stringify({
			name: "Dynamo",
			short_name: "Dynamo",
			description: strings.en.meta.description,
			start_url: "/",
			display: "browser",
			background_color: "#fafafa",
			theme_color: "#fafafa",
			icons: [{ src: icon.src, sizes: "256x256", type: "image/png" }],
		}),
		{ headers: { "Content-Type": "application/manifest+json" } },
	);
