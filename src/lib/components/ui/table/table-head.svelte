<script lang="ts">
	import { cn } from '$lib/utils';
	import type { HTMLAttributes } from 'svelte/elements';
	import type { Snippet } from 'svelte';

	let {
		class: className,
		children,
		...rest
	}: HTMLAttributes<HTMLTableCellElement> & { children?: Snippet } = $props();
</script>

<th
	class={cn(
		'h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0',
		className
	)}
	{...rest}
>
	{@render children?.()}
</th>
