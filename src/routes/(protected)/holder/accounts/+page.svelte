<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Empty from '$lib/components/ui/empty';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Spinner } from '$lib/components/ui/spinner';
	import type { PageData } from './$types';
	import WalletIcon from '@lucide/svelte/icons/wallet';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import SearchIcon from '@lucide/svelte/icons/search';
	import EditIcon from '@lucide/svelte/icons/edit';
	import TrashIcon from '@lucide/svelte/icons/trash';
	import CheckCircleIcon from '@lucide/svelte/icons/check-circle';
	import AlertCircleIcon from '@lucide/svelte/icons/alert-circle';
	import UserIcon from '@lucide/svelte/icons/user';
	import { invalidateAll, goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { onMount, onDestroy } from 'svelte';

	let { data }: { data: PageData } = $props();

	// Search state
	let searchQuery = $state('');
	let debounceTimer: ReturnType<typeof setTimeout> | null = $state(null);

	// Auto-refresh interval (30 seconds)
	let refreshInterval: ReturnType<typeof setInterval> | null = $state(null);
	let isRefreshing = $state(false);

	// Dialog states
	let addDialogOpen = $state(false);
	let editDialogOpen = $state(false);
	let deleteDialogOpen = $state(false);
	let selectedAccount: (typeof data.accounts)[0] | null = $state(null);

	// Form states
	let newAccountForm = $state({
		bankName: '',
		accountHolderName: '',
		accountNumber: '',
		ifscCode: ''
	});

	let editAccountForm = $state({
		bankName: '',
		accountHolderName: '',
		accountNumber: '',
		ifscCode: ''
	});

	// Loading states
	let isCreating = $state(false);
	let isUpdating = $state(false);
	let isDeleting = $state(false);

	// Set up auto-refresh and initialize search
	onMount(() => {
		// Initialize search query from URL
		if (data?.searchQuery) {
			searchQuery = data.searchQuery;
		}

		refreshInterval = setInterval(async () => {
			isRefreshing = true;
			try {
				await invalidateAll();
			} finally {
				isRefreshing = false;
			}
		}, 30000);
	});

	// Clean up interval on destroy
	onDestroy(() => {
		if (refreshInterval) {
			clearInterval(refreshInterval);
		}
		if (debounceTimer) {
			clearTimeout(debounceTimer);
		}
	});

	// Handle search with debounce - only on user input
	let searchTimeout: ReturnType<typeof setTimeout> | null = null;
	function handleSearchInput() {
		if (searchTimeout) {
			clearTimeout(searchTimeout);
		}

		searchTimeout = setTimeout(async () => {
			const params = new URLSearchParams();
			if (searchQuery.trim()) {
				params.set('search', searchQuery.trim());
			}
			await goto(params.toString() ? `?${params.toString()}` : window.location.pathname, {
				keepFocus: true,
				noScroll: true,
				replaceState: true
			});
			await invalidateAll();
		}, 500);
	}

	// Open add dialog
	function openAddDialog() {
		newAccountForm = {
			bankName: '',
			accountHolderName: '',
			accountNumber: '',
			ifscCode: ''
		};
		addDialogOpen = true;
	}

	// Close add dialog
	function closeAddDialog() {
		addDialogOpen = false;
		newAccountForm = {
			bankName: '',
			accountHolderName: '',
			accountNumber: '',
			ifscCode: ''
		};
	}

	// Open edit dialog
	function openEditDialog(account: (typeof data.accounts)[0]) {
		selectedAccount = account;
		// For editing, we need to fetch unmasked data
		// For now, we'll use the masked data and let the user edit
		editAccountForm = {
			bankName: account.bankName,
			accountHolderName: account.accountHolderName,
			accountNumber: account.accountNumber,
			ifscCode: account.ifscCode
		};
		editDialogOpen = true;
	}

	// Close edit dialog
	function closeEditDialog() {
		editDialogOpen = false;
		selectedAccount = null;
		editAccountForm = {
			bankName: '',
			accountHolderName: '',
			accountNumber: '',
			ifscCode: ''
		};
	}

	// Open delete dialog
	function openDeleteDialog(account: (typeof data.accounts)[0]) {
		selectedAccount = account;
		deleteDialogOpen = true;
	}

	// Close delete dialog
	function closeDeleteDialog() {
		deleteDialogOpen = false;
		selectedAccount = null;
	}

	// Create new account
	async function createAccount() {
		// Validation
		if (!newAccountForm.bankName.trim()) {
			toast.error('Bank name is required');
			return;
		}
		if (!newAccountForm.accountHolderName.trim()) {
			toast.error('Account holder name is required');
			return;
		}
		if (!newAccountForm.accountNumber.trim()) {
			toast.error('Account number is required');
			return;
		}
		if (!newAccountForm.ifscCode.trim()) {
			toast.error('IFSC code is required');
			return;
		}

		isCreating = true;
		try {
			const response = await fetch('/api/accounts/holder/create', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(newAccountForm)
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || 'Failed to create bank account');
			}

			toast.success('Bank account created successfully');
			closeAddDialog();
			await invalidateAll();
		} catch (error: any) {
			toast.error(error.message || 'Failed to create bank account');
		} finally {
			isCreating = false;
		}
	}

	// Update account
	async function updateAccount() {
		if (!selectedAccount) return;

		// Validation
		if (!editAccountForm.bankName.trim()) {
			toast.error('Bank name is required');
			return;
		}
		if (!editAccountForm.accountHolderName.trim()) {
			toast.error('Account holder name is required');
			return;
		}
		if (!editAccountForm.accountNumber.trim()) {
			toast.error('Account number is required');
			return;
		}
		if (!editAccountForm.ifscCode.trim()) {
			toast.error('IFSC code is required');
			return;
		}

		// Check if account can be edited (only unmapped accounts)
		if (selectedAccount.status !== 'unmapped') {
			toast.error('You can only edit unmapped accounts');
			return;
		}

		isUpdating = true;
		try {
			const response = await fetch('/api/accounts/holder/update', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					accountId: selectedAccount.id,
					...editAccountForm
				})
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || 'Failed to update bank account');
			}

			toast.success('Bank account updated successfully');
			closeEditDialog();
			await invalidateAll();
		} catch (error: any) {
			toast.error(error.message || 'Failed to update bank account');
		} finally {
			isUpdating = false;
		}
	}

	// Delete account
	async function deleteAccount() {
		if (!selectedAccount) return;

		// Check if account can be deleted (only unmapped accounts)
		if (selectedAccount.status !== 'unmapped') {
			toast.error('You can only delete unmapped accounts');
			closeDeleteDialog();
			return;
		}

		isDeleting = true;
		try {
			const response = await fetch('/api/accounts/holder/delete', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					accountId: selectedAccount.id
				})
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || 'Failed to delete bank account');
			}

			toast.success('Bank account deleted successfully');
			closeDeleteDialog();
			await invalidateAll();
		} catch (error: any) {
			toast.error(error.message || 'Failed to delete bank account');
		} finally {
			isDeleting = false;
		}
	}

	// Get status badge color
	function getStatusColor(status: string, hasPendingRequest: boolean) {
		if (hasPendingRequest) {
			return 'bg-orange-500/20 text-orange-400';
		}
		switch (status) {
			case 'mapped':
				return 'bg-green-500/20 text-green-400';
			case 'unmapped':
				return 'bg-teal-500/20 text-teal-400';
			case 'parked':
				return 'bg-gray-500/20 text-gray-400';
			default:
				return 'bg-gray-500/20 text-gray-400';
		}
	}

	// Get status label
	function getStatusLabel(status: string, hasPendingRequest: boolean) {
		if (hasPendingRequest) {
			return 'Pending Approval';
		}
		switch (status) {
			case 'mapped':
				return 'Mapped';
			case 'unmapped':
				return 'Available';
			case 'parked':
				return 'Parked';
			default:
				return status;
		}
	}

	// Get border color
	function getBorderColor(status: string, hasPendingRequest: boolean) {
		if (hasPendingRequest) {
			return 'border-l-orange-500';
		}
		switch (status) {
			case 'mapped':
				return 'border-l-green-500';
			case 'unmapped':
				return 'border-l-teal-500';
			case 'parked':
				return 'border-l-gray-500';
			default:
				return 'border-l-gray-500';
		}
	}

	// Format date
	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
	}
</script>

<div class="p-4 md:p-6 lg:p-8">
	<!-- Page Header -->
	<div class="mb-6">
		<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
			<div>
				<h1 class="text-3xl font-bold text-foreground">My Accounts</h1>
				<p class="text-sm text-muted-foreground">Manage your bank accounts and view mapping status</p>
			</div>
			<div class="flex items-center gap-3">
				{#if isRefreshing}
					<div class="flex items-center gap-2 text-xs text-muted-foreground">
						<div class="size-2 animate-pulse rounded-full bg-primary"></div>
						<span>Refreshing...</span>
					</div>
				{/if}
				<Button onclick={openAddDialog} class="bg-teal-600 hover:bg-teal-700">
					<PlusIcon class="mr-2 size-4" />
					Add New Account
				</Button>
			</div>
		</div>
	</div>

	<!-- Summary Cards -->
	{#if data?.stats}
		<div class="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
			<Card.Root>
				<Card.Content class="p-4">
					<p class="mb-1 text-sm font-medium text-muted-foreground">TOTAL ACCOUNTS</p>
					<p class="text-3xl font-bold text-foreground">{data.stats.total || 0}</p>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Content class="p-4">
					<p class="mb-1 text-sm font-medium text-muted-foreground">MAPPED</p>
					<p class="text-3xl font-bold text-green-400">{data.stats.mapped || 0}</p>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Content class="p-4">
					<p class="mb-1 text-sm font-medium text-muted-foreground">AVAILABLE</p>
					<p class="text-3xl font-bold text-teal-400">{data.stats.available || 0}</p>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Content class="p-4">
					<p class="mb-1 text-sm font-medium text-muted-foreground">PENDING APPROVAL</p>
					<p class="text-3xl font-bold text-orange-400">{data.stats.pending || 0}</p>
				</Card.Content>
			</Card.Root>
		</div>
	{/if}

	<!-- Search Bar -->
	<div class="mb-6">
		<div class="relative">
			<SearchIcon class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
			<Input
				type="text"
				placeholder="Search by bank name, account number, or status..."
				bind:value={searchQuery}
				oninput={handleSearchInput}
				class="w-full pl-10"
			/>
		</div>
	</div>

	<!-- Accounts List -->
	{#if !data || (data.accounts?.length || 0) === 0}
		<Card.Root>
			<Card.Content class="py-12">
				<Empty.Root>
					<Empty.Header>
						<Empty.Media>
							<WalletIcon class="size-8 text-muted-foreground" />
						</Empty.Media>
						<Empty.Title>No accounts found</Empty.Title>
						<Empty.Description>
							{#if searchQuery}
								No accounts match your search criteria. Try a different search term.
							{:else}
								You haven't added any bank accounts yet. Add your first account to get started.
							{/if}
						</Empty.Description>
					</Empty.Header>
					{#if !searchQuery}
						<Button onclick={openAddDialog}>
							<PlusIcon class="mr-2 size-4" />
							Add New Account
						</Button>
					{/if}
				</Empty.Root>
			</Card.Content>
		</Card.Root>
	{:else}
		<div class="space-y-0 divide-y divide-border">
			{#each data.accounts || [] as account (account.id)}
				{@const borderColor = getBorderColor(account.status, account.hasPendingRequest || false)}
				{@const statusColor = getStatusColor(account.status, account.hasPendingRequest || false)}
				{@const statusLabel = getStatusLabel(account.status, account.hasPendingRequest || false)}
				<Card.Root class="border-l-4 {borderColor} my-5 transition-colors hover:bg-accent/50">
					<Card.Content class="p-4">
						<!-- Header: Bank Name, Status, and Actions -->
						<div class="mb-4 flex items-start justify-between gap-3">
							<div class="min-w-0 flex-1">
								<div class="mb-2 flex flex-wrap items-center gap-2">
									<h3 class="text-base font-semibold text-foreground sm:text-lg">{account.bankName}</h3>
									<span class="shrink-0 rounded-md {statusColor} px-2 py-0.5 text-xs font-medium">
										{statusLabel}
									</span>
								</div>
								<p class="text-xs text-muted-foreground">Added {formatDate(account.createdAt)}</p>
							</div>
							<div class="flex shrink-0 gap-2">
								{#if account.status === 'unmapped'}
									<Button
										variant="outline"
										size="sm"
										onclick={() => openEditDialog(account)}
										class="h-9 w-9 p-0"
									>
										<EditIcon class="size-4" />
									</Button>
									<Button
										variant="outline"
										size="sm"
										onclick={() => openDeleteDialog(account)}
										class="h-9 w-9 p-0 text-destructive hover:text-destructive"
									>
										<TrashIcon class="size-4" />
									</Button>
								{/if}
							</div>
						</div>

						<!-- Account Details Grid -->
						<div class="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
							<div>
								<p class="text-xs font-medium text-muted-foreground">ACCOUNT NUMBER</p>
								<p class="mt-1 font-mono text-sm font-semibold text-foreground">{account.accountNumber}</p>
							</div>
							<div>
								<p class="text-xs font-medium text-muted-foreground">IFSC CODE</p>
								<p class="mt-1 font-mono text-sm font-semibold text-foreground">{account.ifscCode}</p>
							</div>
							<div>
								<p class="text-xs font-medium text-muted-foreground">ACCOUNT HOLDER</p>
								<p class="mt-1 text-sm font-semibold text-foreground">{account.accountHolderName}</p>
							</div>
							{#if account.mappedTo}
								<div>
									<p class="text-xs font-medium text-muted-foreground">MAPPED TO</p>
									<p class="mt-1 text-sm font-semibold text-teal-400">
										{account.mappedTo}
									</p>
								</div>
							{:else}
								<div>
									<p class="text-xs font-medium text-muted-foreground">STATUS</p>
									<p class="mt-1 text-sm font-semibold text-muted-foreground">Not Mapped</p>
								</div>
							{/if}
						</div>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
	{/if}
</div>

<!-- Add Account Dialog -->
<Dialog.Root bind:open={addDialogOpen}>
	<Dialog.Content class="max-h-[90vh] max-w-xl overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>Add Bank Account</Dialog.Title>
			<Dialog.Description>Add a new bank account to the system</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4 py-4">
			<!-- Bank Name -->
			<div>
				<label for="bankName" class="text-sm font-medium">
					Bank Name <span class="text-destructive">*</span>
				</label>
				<Input
					id="bankName"
					bind:value={newAccountForm.bankName}
					placeholder="e.g., HDFC Bank"
					class="mt-1"
				/>
			</div>

			<!-- Account Holder Name -->
			<div>
				<label for="accountHolderName" class="text-sm font-medium">
					Account Holder Name <span class="text-destructive">*</span>
				</label>
				<Input
					id="accountHolderName"
					bind:value={newAccountForm.accountHolderName}
					placeholder="e.g., John Doe"
					class="mt-1"
				/>
			</div>

			<!-- Account Number -->
			<div>
				<label for="accountNumber" class="text-sm font-medium">
					Account Number <span class="text-destructive">*</span>
				</label>
				<Input
					id="accountNumber"
					bind:value={newAccountForm.accountNumber}
					placeholder="e.g., 50100123456789"
					class="mt-1"
				/>
			</div>

			<!-- IFSC Code -->
			<div>
				<label for="ifscCode" class="text-sm font-medium">
					IFSC Code <span class="text-destructive">*</span>
				</label>
				<Input
					id="ifscCode"
					bind:value={newAccountForm.ifscCode}
					placeholder="e.g., HDFC0001234"
					class="mt-1"
				/>
			</div>

			<!-- Added By (Current User Info) -->
			{#if data?.user}
				<div>
					<!-- svelte-ignore a11y_label_has_associated_control -->
					<label class="text-sm font-medium">Added By</label>
					<div class="mt-2 rounded-lg border border-border bg-muted/30 p-4">
						<div class="flex items-center gap-3">
							<div class="flex size-10 items-center justify-center rounded-full bg-primary/10">
								<UserIcon class="size-5 text-primary" />
							</div>
							<div class="flex-1">
								<div class="font-medium text-foreground">{data.user.full_name}</div>
								<div class="text-sm text-muted-foreground">{data.user.email}</div>
							</div>
							<span class="rounded-md bg-teal-500/20 px-2.5 py-1 text-xs font-medium text-teal-400">
								Holder
							</span>
						</div>
					</div>
				</div>
			{/if}
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={closeAddDialog} disabled={isCreating}>Cancel</Button>
			<Button onclick={createAccount} disabled={isCreating}>
				{#if isCreating}
					<Spinner class="mr-2 size-4" />
					Creating...
				{:else}
					Create Account
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Edit Account Dialog -->
<Dialog.Root bind:open={editDialogOpen}>
	<Dialog.Content class="sm:max-w-[500px]">
		<Dialog.Header>
			<Dialog.Title>Edit Account</Dialog.Title>
			<Dialog.Description>Update the details of your bank account</Dialog.Description>
		</Dialog.Header>
		<div class="space-y-4 py-4">
			<div class="space-y-2">
				<label for="edit-bank-name" class="text-sm font-medium">Bank Name</label>
				<Input
					id="edit-bank-name"
					bind:value={editAccountForm.bankName}
					placeholder="e.g., HDFC Bank"
				/>
			</div>
			<div class="space-y-2">
				<label for="edit-account-holder" class="text-sm font-medium">Account Holder Name</label>
				<Input
					id="edit-account-holder"
					bind:value={editAccountForm.accountHolderName}
					placeholder="e.g., John Doe"
				/>
			</div>
			<div class="space-y-2">
				<label for="edit-account-number" class="text-sm font-medium">Account Number</label>
				<Input
					id="edit-account-number"
					bind:value={editAccountForm.accountNumber}
					placeholder="e.g., 1234567890"
				/>
			</div>
			<div class="space-y-2">
				<label for="edit-ifsc-code" class="text-sm font-medium">IFSC Code</label>
				<Input
					id="edit-ifsc-code"
					bind:value={editAccountForm.ifscCode}
					placeholder="e.g., HDFC0001234"
				/>
			</div>
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={closeEditDialog} disabled={isUpdating}>
				Cancel
			</Button>
			<Button onclick={updateAccount} disabled={isUpdating}>
				{#if isUpdating}
					<Spinner class="mr-2 size-4" />
					Updating...
				{:else}
					Update Account
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Delete Account Dialog -->
<Dialog.Root bind:open={deleteDialogOpen}>
	<Dialog.Content class="sm:max-w-[400px]">
		<Dialog.Header>
			<Dialog.Title>Delete Account</Dialog.Title>
			<Dialog.Description>
				Are you sure you want to delete this account? This action cannot be undone.
			</Dialog.Description>
		</Dialog.Header>
		{#if selectedAccount}
			<div class="py-4">
				<div class="rounded-lg border border-border bg-muted/50 p-4">
					<p class="font-medium text-foreground">{selectedAccount.bankName}</p>
					<p class="mt-1 text-sm text-muted-foreground">
						Account Number: {selectedAccount.accountNumber}
					</p>
				</div>
			</div>
		{/if}
		<Dialog.Footer>
			<Button variant="outline" onclick={closeDeleteDialog} disabled={isDeleting}>
				Cancel
			</Button>
			<Button variant="destructive" onclick={deleteAccount} disabled={isDeleting}>
				{#if isDeleting}
					<Spinner class="mr-2 size-4" />
					Deleting...
				{:else}
					Delete Account
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
