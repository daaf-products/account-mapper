<script lang="ts">
	import '../app.css';
	import { Toaster } from '$lib/components/ui/sonner';
	import { ModeWatcher } from 'mode-watcher';

	let { children } = $props();
</script>

<ModeWatcher defaultMode="dark" />
<Toaster />

<div class="dark bg-gradient-main min-h-screen">
	<main>
		{@render children()}
	</main>
</div>
