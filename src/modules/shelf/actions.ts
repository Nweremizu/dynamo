import { providerAction } from "../../core/bridge";

/** Mirrors `Item` in `src-tauri/src/providers/shelf.rs`. */
export interface ShelfItem {
	path: string;
	name: string;
	isDir: boolean;
	ext: string;
	thumb: string | null;
}

/** Mirrors `Download` in `src-tauri/src/providers/shelf/downloads.rs`. */
export interface ShelfDownload {
	name: string;
	bytes: number;
	/** Bytes per second. */
	speed: number;
}

export interface ShelfState {
	items: ShelfItem[];
	downloads: ShelfDownload[];
	/** `<ms>:<name>` of the last finished download. */
	finished: string | null;
}

export const SHELF_PROVIDER = "shelf";

export const addToShelf = (paths: string[]) => providerAction(SHELF_PROVIDER, "add", paths);
export const shelfAction = (action: "remove" | "open" | "drag", path: string) =>
	providerAction(SHELF_PROVIDER, action, path);
