<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Empty from '$lib/components/ui/empty';
	import { Spinner } from '$lib/components/ui/spinner';
	import type { PageData } from './$types';
	import SearchIcon from '@lucide/svelte/icons/search';
	import WalletIcon from '@lucide/svelte/icons/wallet';
	import CheckCircleIcon from '@lucide/svelte/icons/check-circle';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import InfoIcon from '@lucide/svelte/icons/info';
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';

	let { data }: { data: PageData } = $props();

	// Search state
	let searchQuery = $state(data.searchQuery || '');
	let isSearching = $state(false);

	// Request state
	let requestingAccountId = $state<string | null>(null);
	let isRequesting = $state(false);

	// Auto-refresh interval (30 seconds)
	let refreshInterval: ReturnType<typeof setInterval> | null = $state(null);
	let isRefreshing = $state(false);

	// Set up auto-refresh
	onMount(() => {
		refreshInterval = setInterval(async () => {
			isRefreshing = true;
			try {
				await invalidateAll();
			} finally {
				isRefreshing = false;
			}
		}, 30000); // Refresh every 30 seconds
	});

	// Clean up interval on destroy
	onDestroy(() => {
		if (refreshInterval) {
			clearInterval(refreshInterval);
		}
	});

	// Handle search
	async function handleSearch() {
		isSearching = true;
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const params = new URLSearchParams();
		if (searchQuery.trim()) {
			params.set('search', searchQuery.trim());
		}
		await goto(params.toString() ? `?${params.toString()}` : window.location.pathname, {
			keepFocus: true,
			noScroll: true,
			replaceState: false
		});
		isSearching = false;
	}

	// Handle request mapping
	async function requestMapping(accountId: string) {
		if (isRequesting) return;

		requestingAccountId = accountId;
		isRequesting = true;

		try {
			const response = await fetch('/api/requests/create', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					bankAccountId: accountId,
					requestNotes: null
				})
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || 'Failed to create mapping request');
			}

			toast.success('Mapping request submitted successfully');
			// Refresh data to remove the requested account from the list
			await invalidateAll();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to create mapping request');
		} finally {
			isRequesting = false;
			requestingAccountId = null;
		}
	}

	// Filter accounts based on search (client-side for instant feedback)
	let filteredAccounts = $derived(() => {
		if (!searchQuery.trim()) {
			return data.accounts || [];
		}
		const query = searchQuery.toLowerCase();
		return (data.accounts || []).filter(
			(account) =>
				account.bankName.toLowerCase().includes(query) ||
				account.accountNumber.toLowerCase().includes(query) ||
				account.ifscCode.toLowerCase().includes(query) ||
				account.accountHolderName.toLowerCase().includes(query)
		);
	});
</script>

<div class="p-4 md:p-6 lg:p-8">
	<!-- Page Header -->
	<div class="mb-6">
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-3xl font-bold text-foreground">Available Bank Accounts</h1>
				<p class="text-sm text-muted-foreground">
					Browse and request mapping to available bank accounts
				</p>
			</div>
			{#if isRefreshing}
				<div class="flex items-center gap-2 text-xs text-muted-foreground">
					<div class="size-2 animate-pulse rounded-full bg-primary"></div>
					<span>Refreshing...</span>
				</div>
			{/if}
		</div>
	</div>

	<!-- Information Box -->
	<Card.Root class="mb-6 border-teal-500/50 bg-teal-500/5">
		<Card.Content class="flex items-start gap-3 p-4">
			<InfoIcon class="mt-0.5 size-5 shrink-0 text-teal-400" />
			<div class="flex-1">
				<p class="text-sm font-medium text-foreground">Request Bank Account Mapping</p>
				<p class="mt-1 text-xs text-muted-foreground">
					Select an available bank account and submit a mapping request. Your request will be
					reviewed by the admin team.
				</p>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Summary Cards -->
	<div class="mb-6 grid gap-4 md:grid-cols-3">
		<Card.Root class="py-2">
			<Card.Content class="flex items-center justify-between p-4">
				<div class="flex-1">
					<p class="mb-1 text-sm font-medium text-muted-foreground">AVAILABLE ACCOUNTS</p>
					<p class="text-3xl font-bold text-foreground">{data.stats?.available || 0}</p>
				</div>
				<div class="ml-4 rounded-lg bg-cyan-500/25 p-3">
					<WalletIcon class="size-6 text-cyan-300" />
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root class="py-2">
			<Card.Content class="flex items-center justify-between p-4">
				<div class="flex-1">
					<p class="mb-1 text-sm font-medium text-muted-foreground">YOUR MAPPED</p>
					<p class="text-3xl font-bold text-green-400">{data.stats?.mapped || 0}</p>
				</div>
				<div class="ml-4 rounded-lg bg-green-500/25 p-3">
					<CheckCircleIcon class="size-6 text-green-300" />
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root class="py-2">
			<Card.Content class="flex items-center justify-between p-4">
				<div class="flex-1">
					<p class="mb-1 text-sm font-medium text-muted-foreground">PENDING REQUESTS</p>
					<p class="text-3xl font-bold text-yellow-400">{data.stats?.pending || 0}</p>
				</div>
				<div class="ml-4 rounded-lg bg-yellow-500/25 p-3">
					<ClockIcon class="size-6 text-yellow-300" />
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Search Bar -->
	<div class="mb-6">
		<form
			onsubmit={(e) => {
				e.preventDefault();
				handleSearch();
			}}
			class="flex gap-2"
		>
			<div class="relative flex-1">
				<SearchIcon class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
				<Input
					type="text"
					bind:value={searchQuery}
					placeholder="Search by bank name, account number, or branch..."
					class="pl-10"
					onkeydown={(e) => {
						if (e.key === 'Enter') {
							e.preventDefault();
							handleSearch();
						}
					}}
				/>
			</div>
			<Button type="submit" disabled={isSearching}>
				{#if isSearching}
					<Spinner class="mr-2 size-4" />
					Searching...
				{:else}
					<SearchIcon class="mr-2 size-4" />
					Search
				{/if}
			</Button>
		</form>
	</div>

	<!-- Bank Accounts List -->
	{#if filteredAccounts().length === 0}
		<Card.Root>
			<Card.Content class="py-12">
				<Empty.Root>
					<Empty.Header>
						<Empty.Media>
							<WalletIcon class="size-8 text-muted-foreground" />
						</Empty.Media>
						<Empty.Title>No accounts available</Empty.Title>
						<Empty.Description>
							{#if searchQuery.trim()}
								No bank accounts found matching your search. Try a different search term.
							{:else}
								There are no unmapped bank accounts available at the moment. Check back later.
							{/if}
						</Empty.Description>
					</Empty.Header>
				</Empty.Root>
			</Card.Content>
		</Card.Root>
	{:else}
		<div class="space-y-0 divide-y divide-border">
			{#each filteredAccounts() as account (account.id)}
				<Card.Root class="my-5 border-l-4 border-l-teal-500 transition-colors hover:bg-accent/50">
					<Card.Content class="flex items-center justify-between p-4">
						<div class="min-w-0 flex-1">
							<!-- Header with Bank Name and Status -->
							<div class="mb-3 flex items-center gap-3">
								<h3 class="text-lg font-semibold text-foreground">{account.bankName}</h3>
								<span
									class="shrink-0 rounded-md bg-green-500/20 px-2 py-0.5 text-xs font-medium text-green-400"
								>
									Available
								</span>
							</div>

							<!-- Account Details Grid -->
							<div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
								<div>
									<p class="text-xs font-medium text-muted-foreground">ACCOUNT NUMBER</p>
									<p class="mt-0.5 font-mono text-sm text-foreground">{account.accountNumber}</p>
								</div>

								<div>
									<p class="text-xs font-medium text-muted-foreground">IFSC CODE</p>
									<p class="mt-0.5 font-mono text-sm text-foreground">{account.ifscCode}</p>
								</div>

								<div>
									<p class="text-xs font-medium text-muted-foreground">ACCOUNT HOLDER</p>
									<p class="mt-0.5 text-sm text-foreground">{account.accountHolderName}</p>
								</div>

								{#if account.branch}
									<div>
										<p class="text-xs font-medium text-muted-foreground">BRANCH</p>
										<p class="mt-0.5 text-sm text-foreground">{account.branch}</p>
									</div>
								{/if}
							</div>
						</div>

						<!-- Request Button -->
						<div class="ml-4 shrink-0">
							<Button
								class="bg-teal-600 text-white hover:bg-teal-700"
								onclick={() => requestMapping(account.id)}
								disabled={isRequesting && requestingAccountId === account.id}
							>
								{#if isRequesting && requestingAccountId === account.id}
									<Spinner class="mr-2 size-4" />
									Requesting...
								{:else}
									<span class="mr-1">+</span>
									Request Mapping
								{/if}
							</Button>
						</div>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
	{/if}
</div>
