import { appColor, inkOn } from "../stacks";

/** The app's own icon from Windows, or its initial on the app's color when Windows has none. */
export function AppIcon({ app, logo, size }: { app: string; logo: string | null; size: number }) {
	const radius = Math.round(size * 0.27);
	if (logo) {
		return (
			<img
				src={logo}
				alt=""
				width={size}
				height={size}
				draggable={false}
				className="flex-none object-contain"
				style={{ borderRadius: radius }}
			/>
		);
	}
	const color = appColor(app);
	return (
		<span
			aria-hidden
			className="grid flex-none place-items-center font-bold"
			style={{
				width: size,
				height: size,
				borderRadius: radius,
				background: color,
				color: inkOn(color),
				fontSize: size * 0.44,
			}}
		>
			{(app.trim()[0] ?? "•").toUpperCase()}
		</span>
	);
}
