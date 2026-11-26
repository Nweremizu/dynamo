import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";

// The policy stays in docs/privacy so it can be read on GitHub too; the site is English only.
const privacy = defineCollection({
  loader: glob({ pattern: "index.md", base: "../docs/privacy" }),
});

export const collections = { privacy };
