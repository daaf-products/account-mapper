<script lang="ts">
	import { cn } from "$lib/utils";
	import type { HTMLAttributes } from "svelte/elements";
	import type { Snippet } from "svelte";

	let { 
		class: className, 
		children,
		...rest 
	}: HTMLAttributes<HTMLTableSectionElement> & { children?: Snippet } = $props();
</script>

<tfoot
	class={cn("border-t bg-muted/50 font-medium [&_tr]:last:border-b-0", className)}
	{...rest}
>
	{@render children?.()}
</tfoot>
