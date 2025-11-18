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

<thead class={cn("[&_tr]:border-b", className)} {...rest}>
	{@render children?.()}
</thead>
