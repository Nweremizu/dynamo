import en, { type Strings } from "./en";
import ptBr from "./pt-br";

export type Lang = "en" | "pt-br";

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

/** Path of a page in the given language, with the GitHub Pages base. */
export function href(lang: Lang, page: "" | "privacy" = ""): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const prefix = lang === "en" ? "" : `/${lang}`;
  return `${base}${prefix}/${page ? `${page}/` : ""}`;
}

/** A file in `public/`, with the GitHub Pages base. */
export const asset = (path: string) => `${import.meta.env.BASE_URL.replace(/\/$/, "")}/${path}`;

export const strings: Record<Lang, Strings> = { en, "pt-br": ptBr };
