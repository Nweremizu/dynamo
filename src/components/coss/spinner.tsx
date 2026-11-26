// coss ui (spinner): https://coss.com/ui/docs/components/spinner. Adapted: tailwind-variants, island tokens.
import { Loader2Icon } from "lucide-react";
import type React from "react";
import { cn } from "../../core/cn";

export function Spinner({ className, ...props }: React.ComponentProps<typeof Loader2Icon>): React.ReactElement {
	return <Loader2Icon aria-label="Loading" className={cn("animate-spin", className)} role="status" {...props} />;
}
