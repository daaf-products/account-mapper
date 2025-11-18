<script lang="ts">
	import { cn } from "$lib/utils";
	import type { HTMLAttributes } from "svelte/elements";
	import type { Snippet } from "svelte";

	let { 
		class: className, 
		children,
		...rest 
	}: HTMLAttributes<HTMLTableCaptionElement> & { children?: Snippet } = $props();
</script>

<caption class={cn("mt-4 text-sm text-muted-foreground", className)} {...rest}>
	{@render children?.()}
</caption>
