<script lang="ts">
	import { cn } from "$lib/utils";
	import type { HTMLAttributes } from "svelte/elements";
	import type { Snippet } from "svelte";

	let { 
		class: className, 
		children,
		colspan,
		...rest 
	}: HTMLAttributes<HTMLTableCellElement> & { children?: Snippet; colspan?: number } = $props();
</script>

<td class={cn("p-4 align-middle [&:has([role=checkbox])]:pr-0", className)} colspan={colspan} {...rest}>
	{@render children?.()}
</td>
