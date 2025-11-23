<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Empty from '$lib/components/ui/empty';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Spinner } from '$lib/components/ui/spinner';
	import type { PageData } from './$types';
	import SearchIcon from '@lucide/svelte/icons/search';
	import WalletIcon from '@lucide/svelte/icons/wallet';
	import CheckCircleIcon from '@lucide/svelte/icons/check-circle';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import TrashIcon from '@lucide/svelte/icons/trash';
	import EyeIcon from '@lucide/svelte/icons/eye';
	import { invalidateAll } from '$app/navigation';
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';

	let { data }: { data: PageData } = $props();

	// Search state
	let searchQuery = $state(data.filters?.search || '');
	let isSearching = $state(false);

	// Filter state
	let activeTab = $state(data.filters?.status || 'mapped');

	// Dialog state
	let dialogOpen = $state(false);
	let selectedAccount = $state<(typeof data.accounts)[0] | null>(null);
	let unmaskedData = $state<{
		accountNumber: string;
		ifscCode: string;
		accountHolderName: string;
	} | null>(null);
	let isUnmasking = $state(false);

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
		if (activeTab !== 'mapped') {
			params.set('status', activeTab);
		}
		await goto(params.toString() ? `?${params.toString()}` : window.location.pathname, {
			keepFocus: true,
			noScroll: true,
			replaceState: false
		});
		isSearching = false;
	}

	// Handle tab change
	async function handleTabChange(tab: string) {
		activeTab = tab;
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const params = new URLSearchParams();
		if (searchQuery.trim()) {
			params.set('search', searchQuery.trim());
		}
		if (tab !== 'mapped') {
			params.set('status', tab);
		}
		await goto(params.toString() ? `?${params.toString()}` : window.location.pathname, {
			keepFocus: true,
			noScroll: true,
			replaceState: false
		});
	}

	// Open dialog and fetch unmasked data
	async function openAccountDialog(account: (typeof data.accounts)[0]) {
		selectedAccount = account;
		dialogOpen = true;

		// Only fetch unmasked data for mapped/parked accounts, not pending requests
		if (account.status === 'pending') {
			unmaskedData = null;
			isUnmasking = false;
			return;
		}

		isUnmasking = true;
		unmaskedData = null;

		try {
			// Fetch unmasked account details from API
			const response = await fetch(`/api/accounts/${account.id}/unmask`, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json'
				}
			});

			if (!response.ok) {
				throw new Error('Failed to fetch account details');
			}

			const result = await response.json();
			unmaskedData = {
				accountNumber: result.data.accountNumber,
				ifscCode: result.data.ifscCode,
				accountHolderName: result.data.accountHolderName
			};
		} catch {
			// Silently fail - will show masked data
		} finally {
			isUnmasking = false;
		}
	}

	// Close dialog
	function closeDialog() {
		dialogOpen = false;
		selectedAccount = null;
		unmaskedData = null;
	}

	// Format date helper
	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	// Filter accounts based on active tab and search
	let filteredAccounts = $derived(() => {
		let accounts = data.accounts || [];

		// Apply search filter (client-side for instant feedback)
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			accounts = accounts.filter(
				(account) =>
					account.bankName.toLowerCase().includes(query) ||
					account.accountNumber.toLowerCase().includes(query) ||
					account.ifscCode.toLowerCase().includes(query) ||
					account.accountHolderName.toLowerCase().includes(query)
			);
		}

		return accounts;
	});
</script>

<div class="p-4 md:p-6 lg:p-8">
	<!-- Page Header -->
	<div class="mb-6">
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-3xl font-bold text-foreground">Mapped Bank Accounts</h1>
				<p class="text-sm text-muted-foreground">
					View and manage your mapped, pending, and parked bank accounts.
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

	<!-- Overview Cards -->
	<div class="mb-6 grid gap-4 md:grid-cols-3">
		<Card.Root class="py-2">
			<Card.Content class="flex items-center justify-between p-4">
				<div class="flex-1">
					<p class="mb-1 text-sm font-medium text-muted-foreground">MAPPED</p>
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
					<p class="mb-1 text-sm font-medium text-muted-foreground">PENDING</p>
					<p class="text-3xl font-bold text-yellow-400">{data.stats?.pending || 0}</p>
				</div>
				<div class="ml-4 rounded-lg bg-yellow-500/25 p-3">
					<ClockIcon class="size-6 text-yellow-300" />
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root class="py-2">
			<Card.Content class="flex items-center justify-between p-4">
				<div class="flex-1">
					<p class="mb-1 text-sm font-medium text-muted-foreground">PARKED</p>
					<p class="text-3xl font-bold text-muted-foreground">{data.stats?.parked || 0}</p>
				</div>
				<div class="ml-4 rounded-lg bg-gray-500/25 p-3">
					<TrashIcon class="size-6 text-gray-300" />
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Filter Tabs -->
	<div class="mb-6 flex gap-2 border-b border-border">
		<button
			type="button"
			class="relative -mb-px rounded-t-lg px-4 py-2 text-sm font-medium transition-colors {activeTab ===
			'mapped'
				? 'border-b-2 border-primary bg-primary/10 text-foreground'
				: 'text-muted-foreground hover:text-foreground'}"
			onclick={() => handleTabChange('mapped')}
		>
			Currently Mapped
			{#if data.stats?.mapped > 0}
				<span class="ml-2 rounded-full bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
					{data.stats.mapped}
				</span>
			{/if}
		</button>
		<button
			type="button"
			class="relative -mb-px rounded-t-lg px-4 py-2 text-sm font-medium transition-colors {activeTab ===
			'pending'
				? 'border-b-2 border-primary bg-primary/10 text-foreground'
				: 'text-muted-foreground hover:text-foreground'}"
			onclick={() => handleTabChange('pending')}
		>
			Pending Requests
			{#if data.stats?.pending > 0}
				<span
					class="ml-2 rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs font-medium text-yellow-400"
				>
					{data.stats.pending}
				</span>
			{/if}
		</button>
		<button
			type="button"
			class="relative -mb-px rounded-t-lg px-4 py-2 text-sm font-medium transition-colors {activeTab ===
			'parked'
				? 'border-b-2 border-primary bg-primary/10 text-foreground'
				: 'text-muted-foreground hover:text-foreground'}"
			onclick={() => handleTabChange('parked')}
		>
			Parked
			{#if data.stats?.parked > 0}
				<span
					class="ml-2 rounded-full bg-gray-500/20 px-2 py-0.5 text-xs font-medium text-muted-foreground"
				>
					{data.stats.parked}
				</span>
			{/if}
		</button>
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
						<Empty.Title>No accounts found</Empty.Title>
						<Empty.Description>
							{#if searchQuery.trim()}
								No bank accounts found matching your search. Try a different search term.
							{:else if activeTab === 'pending'}
								You don't have any pending mapping requests.
							{:else if activeTab === 'parked'}
								You don't have any parked accounts.
							{:else}
								You don't have any mapped bank accounts yet.
							{/if}
						</Empty.Description>
					</Empty.Header>
				</Empty.Root>
			</Card.Content>
		</Card.Root>
	{:else}
		<div class="space-y-0 divide-y divide-border">
			{#each filteredAccounts() as account (account.id)}
				{@const borderColor =
					account.status === 'mapped'
						? 'border-l-teal-500'
						: account.status === 'pending'
							? 'border-l-yellow-500'
							: 'border-l-gray-500'}
				<Card.Root
					class="border-l-4 {borderColor} my-5 cursor-pointer transition-colors hover:bg-accent/50"
					onclick={() => openAccountDialog(account)}
				>
					<Card.Content class="flex items-center justify-between p-4">
						<div class="min-w-0 flex-1">
							<!-- Header with Bank Name and Status -->
							<div class="mb-3 flex items-center gap-3">
								<h3 class="text-lg font-semibold text-foreground">{account.bankName}</h3>
								<span
									class="shrink-0 rounded-md {account.status === 'mapped'
										? 'bg-green-500/20 text-green-400'
										: account.status === 'pending'
											? 'bg-yellow-500/20 text-yellow-400'
											: 'bg-gray-500/20 text-gray-400'} px-2 py-0.5 text-xs font-medium"
								>
									{account.status === 'mapped'
										? 'Mapped'
										: account.status === 'pending'
											? 'Pending'
											: 'Parked'}
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

								<div>
									<p class="text-xs font-medium text-muted-foreground">
										{account.status === 'pending' ? 'REQUESTED DATE' : 'MAPPED DATE'}
									</p>
									<p class="mt-0.5 text-sm text-foreground">{formatDate(account.mappedAt)}</p>
								</div>
							</div>
						</div>

						<!-- View Details Button -->
						<div class="ml-4 shrink-0">
							<Button variant="outline">
								<EyeIcon class="mr-2 size-4" />
								View Details
							</Button>
						</div>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
	{/if}
</div>

<!-- Account Details Dialog -->
<Dialog.Root bind:open={dialogOpen}>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<Dialog.Title>Bank Account Details</Dialog.Title>
			<Dialog.Description>View unmasked account information</Dialog.Description>
		</Dialog.Header>

		{#if selectedAccount}
			<div class="space-y-4 py-4">
				{#if selectedAccount.status === 'pending'}
					<!-- Pending Request Details (Masked) -->
					<div class="space-y-4">
						<div class="rounded-lg border border-yellow-500/50 bg-yellow-500/5 p-3">
							<p class="text-sm font-medium text-yellow-400">
								This request is pending approval. Details will be available once approved.
							</p>
						</div>
						<div>
							<p class="text-xs font-medium text-muted-foreground">Bank Name</p>
							<p class="mt-1 text-base font-semibold text-foreground">{selectedAccount.bankName}</p>
						</div>
						<div>
							<p class="text-xs font-medium text-muted-foreground">Account Number</p>
							<p class="mt-1 font-mono text-sm text-foreground">{selectedAccount.accountNumber}</p>
						</div>
						<div>
							<p class="text-xs font-medium text-muted-foreground">IFSC Code</p>
							<p class="mt-1 font-mono text-sm text-foreground">{selectedAccount.ifscCode}</p>
						</div>
						<div>
							<p class="text-xs font-medium text-muted-foreground">Requested Date</p>
							<p class="mt-1 text-sm text-foreground">{formatDate(selectedAccount.mappedAt)}</p>
						</div>
					</div>
				{:else if isUnmasking}
					<div class="flex items-center justify-center py-8">
						<Spinner class="size-6" />
						<span class="ml-2 text-sm text-muted-foreground">Loading details...</span>
					</div>
				{:else if unmaskedData}
					<!-- Unmasked Details -->
					<div class="space-y-4">
						<div>
							<p class="text-xs font-medium text-muted-foreground">Bank Name</p>
							<p class="mt-1 text-base font-semibold text-foreground">{selectedAccount.bankName}</p>
						</div>

						<div>
							<p class="text-xs font-medium text-muted-foreground">Account Number</p>
							<p class="mt-1 font-mono text-lg text-foreground">{unmaskedData.accountNumber}</p>
						</div>

						<div>
							<p class="text-xs font-medium text-muted-foreground">IFSC Code</p>
							<p class="mt-1 font-mono text-base text-foreground">{unmaskedData.ifscCode}</p>
						</div>

						<div>
							<p class="text-xs font-medium text-muted-foreground">Account Holder Name</p>
							<p class="mt-1 text-base text-foreground">{unmaskedData.accountHolderName}</p>
						</div>

						<div>
							<p class="text-xs font-medium text-muted-foreground">Mapped Date</p>
							<p class="mt-1 text-sm text-foreground">{formatDate(selectedAccount.mappedAt)}</p>
						</div>

						<div>
							<p class="text-xs font-medium text-muted-foreground">Status</p>
							<span
								class="mt-1 inline-block rounded-md {selectedAccount.status === 'mapped'
									? 'bg-green-500/20 text-green-400'
									: 'bg-gray-500/20 text-gray-400'} px-2 py-1 text-xs font-medium"
							>
								{selectedAccount.status === 'mapped' ? 'Mapped' : 'Parked'}
							</span>
						</div>
					</div>
				{:else}
					<div class="py-8 text-center">
						<p class="text-sm text-muted-foreground">Failed to load account details</p>
					</div>
				{/if}
			</div>

			<Dialog.Footer>
				<Button variant="outline" onclick={closeDialog}>Close</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>
