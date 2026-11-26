import { type ReactNode, useEffect } from "react";
import { Tile } from "../../components/ui/tile";
import { useToolbarTitle } from "./toolbar";

export { NEUTRAL_TILE, Tile } from "../../components/ui/tile";

/**
 * A page's header: its icon on a large tile, the title (the page's one `h1`)
 * and a sentence introducing it; `aside` holds a control that acts on the
 * whole page. The toolbar picks the title up once this scrolls away.
 */
export function PageHeader({
	icon,
	tone,
	title,
	desc,
	aside,
}: {
	icon?: ReactNode;
	tone?: string;
	title: string;
	desc?: ReactNode;
	aside?: ReactNode;
}) {
	const setTitle = useToolbarTitle();
	useEffect(() => setTitle(title), [setTitle, title]);

	return (
		<header data-page-header className="mb-2 flex items-start gap-4">
			{icon && (
				<span className="max-[40rem]:hidden">
					<Tile tone={tone} size="lg">
						{icon}
					</Tile>
				</span>
			)}
			<div className="flex min-w-0 flex-1 flex-col gap-1 pt-0.5">
				<h1 className="text-[22px]/[1.15] font-semibold tracking-[-0.015em] text-balance">{title}</h1>
				{desc && <p className="max-w-[62ch] text-[13px]/[1.45] text-text-dim text-pretty">{desc}</p>}
			</div>
			{aside && <div className="flex-none pt-1">{aside}</div>}
		</header>
	);
}
