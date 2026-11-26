import { art, defineMock, provider } from "./kit";

type Item = { path: string; name: string; isDir: boolean; ext: string; thumb: string | null };

const fromPath = (path: string): Item => {
	const name = path.split(/[\\/]/).pop() ?? path;
	const dot = name.lastIndexOf(".");
	return { path, name, isDir: dot < 1, ext: dot < 1 ? "" : name.slice(dot + 1), thumb: null };
};

type Download = { name: string; bytes: number; speed: number };

const state = provider("shelf", {
	downloads: [] as Download[],
	finished: null as string | null,
	items: [
		fromPath("C:\\Users\\me\\Desktop\\report.pdf"),
		fromPath("C:\\Users\\me\\Pictures"),
		{ ...fromPath("C:\\Users\\me\\Desktop\\cover.png"), thumb: art },
	],
});

export const shelf = defineMock({
	label: "Shelf",
	start: () => state.publish(),
	controls: [
		{
			kind: "toggle",
			label: "Downloading",
			value: () => state.get().downloads.length > 0,
			set: (on) =>
				state.set((s) => ({
					...s,
					downloads: on ? [{ name: "ubuntu-24.04-desktop-amd64.iso", bytes: 1_284_000_000, speed: 8_400_000 }] : [],
				})),
		},
		{
			kind: "button",
			label: "Finish download",
			run: () =>
				state.set((s) => ({
					...s,
					downloads: [],
					finished: `${Date.now()}:setup.exe`,
					items: [fromPath("C:\\Users\\me\\Downloads\\setup.exe"), ...s.items],
				})),
		},
		{
			kind: "button",
			label: "Add file",
			run: () =>
				state.set((s) => ({
					...s,
					items: [...s.items, fromPath(`C:\\Users\\me\\Downloads\\file-${s.items.length + 1}.zip`)],
				})),
		},
	],
	actions: {
		shelf: {
			add: (paths) => state.set((s) => ({ ...s, items: [...s.items, ...(paths as string[]).map(fromPath)] })),
			remove: (path) => state.set((s) => ({ ...s, items: s.items.filter((i) => i.path !== path) })),
			clear: () => state.set((s) => ({ ...s, items: [] })),
		},
	},
});

export const setShelf = state.set;
