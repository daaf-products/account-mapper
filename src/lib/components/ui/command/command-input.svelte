<!--
	Installed from @ieedan/shadcn-svelte-extras
-->

<script lang="ts">
	import { Command as CommandPrimitive } from 'bits-ui';
	import SearchIcon from '@lucide/svelte/icons/search';
	import { cn } from '$lib/utils/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		value = $bindable(''),
		...restProps
	}: CommandPrimitive.InputProps = $props();
</script>

<div
	class="flex h-9 items-center gap-2 border-b border-border px-3"
	data-slot="command-input-wrapper"
>
	<SearchIcon class="size-4 shrink-0 text-muted-foreground" />
	<CommandPrimitive.Input
		data-slot="command-input"
		class={cn(
			'flex h-10 w-full rounded-md bg-transparent py-3 text-sm text-popover-foreground outline-hidden placeholder:text-muted-foreground/60 disabled:cursor-not-allowed disabled:opacity-50',
			className
		)}
		bind:ref
		{...restProps}
		bind:value
	/>
</div>
