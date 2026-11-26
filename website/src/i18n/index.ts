import en, { type Strings } from "./en";

/** The site is in English only; pages still take a `lang` so another one can come back. */
export type Lang = "en";

export const REPO = "https://github.com/Nweremizu/dynamo";
export const DOWNLOAD = `${REPO}/releases/latest`;
export const LINKS = {
  releases: `${REPO}/releases`,
  issues: `${REPO}/issues`,
  plugins: `${REPO}/tree/main/docs/plugins`,
  api: `${REPO}#local-api`,
  license: `${REPO}/blob/main/LICENSE`,
  basedOn: "https://github.com/HeyyCzer/windows-island",
};

/** Path of a page (always with a trailing slash: one URL per page). */
export function href(_lang: Lang, page: "" | "privacy" = ""): string {
  return `/${page ? `${page}/` : ""}`;
}

/** A file in `public/`. */
export const asset = (path: string) => `/${path}`;

export const strings: Record<Lang, Strings> = { en };
