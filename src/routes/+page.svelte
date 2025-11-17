<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import type { PageData } from './$types';
	import LogOutIcon from '@lucide/svelte/icons/log-out';

	let { data }: { data: PageData } = $props();
	let isLoading = $state(false);
</script>

<div class="min-h-screen p-4">
	<!-- Header with user info and logout -->
	<header class="mb-8 flex items-center justify-between border-b border-border pb-4">
		<div>
			<h1 class="text-3xl font-bold">Account Mapper</h1>
			<p class="text-sm text-muted-foreground">
				Welcome back, {data.user.full_name}
			</p>
		</div>
		<form
			method="POST"
			action="?/logout"
			use:enhance={() => {
				isLoading = true;
				return async ({ result, update }) => {
					isLoading = false;
					if (result.type === 'redirect') {
						toast.success('Logged out successfully');
					}
					await update();
				};
			}}
		>
			<Button type="submit" variant="outline" disabled={isLoading}>
				<LogOutIcon class="mr-2 size-4" />
				{isLoading ? 'Logging out...' : 'Logout'}
			</Button>
		</form>
	</header>

	<!-- Main content -->
	<div class="flex items-center justify-center">
		<div class="text-center">
			<h2 class="mb-2 text-2xl font-bold">Dashboard</h2>
			<p class="text-muted-foreground">Your account mapping solution</p>
			<div class="mt-6 rounded-lg border border-border bg-card p-6 text-left">
				<h3 class="mb-2 font-semibold">User Information</h3>
				<div class="space-y-1 text-sm">
					<p><span class="text-muted-foreground">Full Name:</span> {data.user.full_name}</p>
					<p><span class="text-muted-foreground">Initials:</span> {data.user.initials}</p>
					<p><span class="text-muted-foreground">Email:</span> {data.user.email}</p>
					<p><span class="text-muted-foreground">Type:</span> {data.user.type}</p>
					<p><span class="text-muted-foreground">Status:</span> {data.user.status}</p>
					{#if data.user.phone_number}
						<p><span class="text-muted-foreground">Phone:</span> {data.user.phone_number}</p>
					{/if}
				</div>
			</div>
		</div>
	</div>
</div>
