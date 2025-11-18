<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Table from '$lib/components/ui/table';
	import * as Popover from '$lib/components/ui/popover';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Command from '$lib/components/ui/command';
	import { Spinner } from '$lib/components/ui/spinner';
	import type { PageData } from './$types';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import SearchIcon from '@lucide/svelte/icons/search';
	import CheckCircle2Icon from '@lucide/svelte/icons/check-circle-2';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import ParkingCircleIcon from '@lucide/svelte/icons/parking-circle';
	import WalletIcon from '@lucide/svelte/icons/wallet';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import CheckIcon from '@lucide/svelte/icons/check';
	import BuildingIcon from '@lucide/svelte/icons/building';
	import UserIcon from '@lucide/svelte/icons/user';
	import EyeIcon from '@lucide/svelte/icons/eye';
	import EyeOffIcon from '@lucide/svelte/icons/eye-off';
	import { goto, invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { onMount } from 'svelte';

	type BankAccount = {
		id: string;
		accountHolderName: string;
		bankName: string;
		accountNumber: string;
		ifscCode: string;
		status: 'mapped' | 'unmapped' | 'parked';
		addedByType: 'management' | 'holder';
		addedByUserId: string;
		addedByUserName: string;
		mappedToUserId: string | null;
		mappedToUserName: string | null;
		createdAt: string;
		updatedAt: string;
		isMasked: boolean;
	};

	type Merchant = {
		id: string;
		fullName: string;
	};

	let { data }: { data: PageData } = $props();

	// Search state
	let searchQuery = $state('');

	// Filter state - read from server data
	let statusFilter = $state(data.filters?.status || 'all');
	let addedByFilter = $state(data.filters?.addedBy || 'all');
	let isLoading = $state(false);
	let statusPopoverOpen = $state(false);
	let addedByPopoverOpen = $state(false);

	// Edit Dialog state
	let editDialogOpen = $state(false);
	let selectedAccount: BankAccount | null = $state(null);
	let editingStatus = $state('');
	let editingMappedToUserId = $state<string | null>(null);
	let isSaving = $state(false);

	// Merchants list for mapping
	let merchants: Merchant[] = $state([]);
	let isLoadingMerchants = $state(false);

	// Merchant selection command dialog
	let merchantCommandOpen = $state(false);

	// Revealed account details
	let revealedAccountNumber = $state<string | null>(null);
	let revealedIfscCode = $state<string | null>(null);
	let isRevealing = $state(false);
	let isRevealed = $state(false);

	// Add Account Dialog state
	let addDialogOpen = $state(false);
	let newAccountForm = $state({
		bankName: '',
		accountHolderName: '',
		accountNumber: '',
		ifscCode: '',
		status: 'unmapped' as 'mapped' | 'unmapped' | 'parked',
		addedByType: 'holder' as 'management' | 'holder',
		addedByUserId: '',
		mappedToUserId: null as string | null
	});
	let isCreating = $state(false);
	
	// User can potentially reveal data (we'll check permissions on API call)
	// Management, Merchant, and Holder all have different reveal permissions
	const canAttemptReveal = $derived(
		data.user.type === 'management' || 
		data.user.type === 'merchant' || 
		data.user.type === 'holder'
	);

	// Auto-clear merchant mapping when status is changed to unmapped
	$effect(() => {
		if (editingStatus === 'unmapped' && editingMappedToUserId !== null) {
			editingMappedToUserId = null;
		}
	});

	// Pagination state (desktop only)
	let currentPage = $state(0);
	let pageSize = $state(10);

	// Infinite scroll state (mobile only)
	let mobileItemsToShow = $state(10);
	let loadMoreSentinel: HTMLElement | null = $state(null);

	// Filter options
	const statusOptions = [
		{ value: 'all', label: 'All Status' },
		{ value: 'mapped', label: 'Mapped' },
		{ value: 'unmapped', label: 'Unmapped' },
		{ value: 'parked', label: 'Parked' }
	];

	const addedByOptions = [
		{ value: 'all', label: 'All Types' },
		{ value: 'management', label: 'Management' },
		{ value: 'holder', label: 'Holder' }
	];

	// Fetch merchants on mount
	onMount(async () => {
		await fetchMerchants();
	});

	// Fetch list of merchants for mapping
	async function fetchMerchants() {
		isLoadingMerchants = true;
		try {
			const response = await fetch('/api/users/list?type=merchant');
			if (response.ok) {
				const result = await response.json();
				merchants = result.users || [];
			}
		} catch (error) {
			console.error('Error fetching merchants:', error);
		} finally {
			isLoadingMerchants = false;
		}
	}

	// Open account details dialog
	function openAccountDialog(account: BankAccount) {
		selectedAccount = account;
		editingStatus = account.status;
		editingMappedToUserId = account.mappedToUserId;
		// Reset revealed data
		revealedAccountNumber = null;
		revealedIfscCode = null;
		isRevealed = false;
		editDialogOpen = true;
	}

	// Close dialog
	function closeEditDialog() {
		editDialogOpen = false;
		selectedAccount = null;
		editingStatus = '';
		editingMappedToUserId = null;
		revealedAccountNumber = null;
		revealedIfscCode = null;
		isRevealed = false;
	}

	// Reveal sensitive account data
	async function revealAccountData() {
		if (!selectedAccount || !canAttemptReveal) return;

		isRevealing = true;
		try {
			const response = await fetch('/api/accounts/reveal', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					accountId: selectedAccount.id
				})
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to reveal account data');
			}

			const result = await response.json();
			revealedAccountNumber = result.data.accountNumber;
			revealedIfscCode = result.data.ifscCode;
			isRevealed = true;
			toast.success('Account details revealed');
		} catch (error: any) {
			console.error('Error revealing account data:', error);
			toast.error(error.message || 'You do not have permission to view these details');
		} finally {
			isRevealing = false;
		}
	}

	// Hide sensitive account data
	function hideAccountData() {
		revealedAccountNumber = null;
		revealedIfscCode = null;
		isRevealed = false;
	}

	// Get selected merchant name
	function getSelectedMerchantName(): string {
		if (!editingMappedToUserId) return 'Not Mapped';
		const merchant = merchants.find((m) => m.id === editingMappedToUserId);
		return merchant?.fullName || 'Unknown Merchant';
	}

	// Select merchant from command dialog
	function selectMerchant(merchantId: string | null) {
		editingMappedToUserId = merchantId;
		merchantCommandOpen = false;
	}

	// Open add account dialog
	function openAddDialog() {
		// Use logged-in user's details
		const currentUserId = data.user.id;
		const currentUserType = data.user.type;
		
		// Map user type to added_by_type
		// Only management and holder can add accounts (not merchant)
		const addedByType = currentUserType === 'management' ? 'management' : 'holder';
		
		newAccountForm = {
			bankName: '',
			accountHolderName: '',
			accountNumber: '',
			ifscCode: '',
			status: 'unmapped',
			addedByType: addedByType as 'management' | 'holder',
			addedByUserId: currentUserId,
			mappedToUserId: null
		};
		addDialogOpen = true;
	}

	// Close add account dialog
	function closeAddDialog() {
		addDialogOpen = false;
		newAccountForm = {
			bankName: '',
			accountHolderName: '',
			accountNumber: '',
			ifscCode: '',
			status: 'unmapped',
			addedByType: 'holder',
			addedByUserId: '',
			mappedToUserId: null
		};
	}

	// Auto-clear merchant mapping when status is unmapped in add form
	$effect(() => {
		if (newAccountForm.status === 'unmapped' && newAccountForm.mappedToUserId !== null) {
			newAccountForm.mappedToUserId = null;
		}
	});

	// Get user type color for pill
	function getUserTypeColor(type: string) {
		switch (type) {
			case 'management':
				return 'bg-orange-500/20 text-orange-400';
			case 'merchant':
				return 'bg-purple-500/20 text-purple-400';
			case 'holder':
				return 'bg-teal-500/20 text-teal-400';
			default:
				return 'bg-gray-500/20 text-gray-400';
		}
	}

	// Create new bank account
	async function createBankAccount() {
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
		if (!newAccountForm.addedByUserId) {
			toast.error('Please select who added this account');
			return;
		}
		if (newAccountForm.status === 'mapped' && !newAccountForm.mappedToUserId) {
			toast.error('Mapped accounts must have a merchant assigned');
			return;
		}

		isCreating = true;
		try {
			const response = await fetch('/api/accounts/create', {
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
			await invalidateAll(); // Refresh data
		} catch (error: any) {
			console.error('Error creating bank account:', error);
			toast.error(error.message || 'Failed to create bank account');
		} finally {
			isCreating = false;
		}
	}

	// Save account changes
	async function saveAccount() {
		if (!selectedAccount) return;

		isSaving = true;
		try {
			const response = await fetch('/api/accounts/update', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					accountId: selectedAccount.id,
					status: editingStatus,
					mappedToUserId: editingMappedToUserId
				})
			});

			if (!response.ok) {
				throw new Error('Failed to update account');
			}

			toast.success('Account updated successfully');
			closeEditDialog();
			await invalidateAll(); // Refresh data
		} catch (error) {
			console.error('Error updating account:', error);
			toast.error('Failed to update account');
		} finally {
			isSaving = false;
		}
	}

	// Handle status filter change
	async function handleStatusChange(value: string) {
		statusFilter = value;
		statusPopoverOpen = false;
		await applyFilters();
	}

	// Handle added by filter change
	async function handleAddedByChange(value: string) {
		addedByFilter = value;
		addedByPopoverOpen = false;
		await applyFilters();
	}

	// Apply filters - make API call
	async function applyFilters() {
		isLoading = true;
		const params = new URLSearchParams();
		
		if (statusFilter !== 'all') {
			params.set('status', statusFilter);
		}
		
		if (addedByFilter !== 'all') {
			params.set('addedBy', addedByFilter);
		}

		const queryString = params.toString();
		await goto(queryString ? `?${queryString}` : window.location.pathname, {
			keepFocus: true,
			noScroll: true,
			replaceState: false
		});
		isLoading = false;
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

	// Get status display properties
	function getStatusDisplay(status: 'mapped' | 'unmapped' | 'parked') {
		switch (status) {
			case 'mapped':
				return {
					icon: CheckCircle2Icon,
					color: 'text-green-400',
					label: 'Mapped'
				};
			case 'unmapped':
				return {
					icon: ClockIcon,
					color: 'text-blue-400',
					label: 'Unmapped'
				};
			case 'parked':
				return {
					icon: ParkingCircleIcon,
					color: 'text-yellow-400',
					label: 'Parked'
				};
		}
	}

	// Get added by color
	function getAddedByColor(type: 'management' | 'holder') {
		return type === 'management'
			? 'bg-orange-500/20 text-orange-400'
			: 'bg-teal-500/20 text-teal-400';
	}

	// Filter accounts based on search
	const filteredAccounts = $derived(() => {
		if (!data.accounts) return [];
		if (!searchQuery.trim()) return data.accounts;

		const query = searchQuery.toLowerCase();
		return data.accounts.filter(
			(account: BankAccount) =>
				account.accountHolderName.toLowerCase().includes(query) ||
				account.bankName.toLowerCase().includes(query) ||
				account.accountNumber.toLowerCase().includes(query) ||
				account.ifscCode.toLowerCase().includes(query) ||
				account.addedByUserName.toLowerCase().includes(query) ||
				account.mappedToUserName?.toLowerCase().includes(query)
		);
	});

	// Paginated accounts (desktop)
	const paginatedAccounts = $derived(() => {
		const accounts = filteredAccounts();
		const start = currentPage * pageSize;
		const end = start + pageSize;
		return accounts.slice(start, end);
	});

	// Mobile infinite scroll accounts
	const mobileAccounts = $derived(() => {
		const accounts = filteredAccounts();
		return accounts.slice(0, mobileItemsToShow);
	});

	// Pagination helpers (desktop)
	const totalPages = $derived(Math.ceil((filteredAccounts()?.length || 0) / pageSize));
	const canGoBack = $derived(currentPage > 0);
	const canGoForward = $derived(currentPage < totalPages - 1);

	function nextPage() {
		if (canGoForward) currentPage++;
	}

	function previousPage() {
		if (canGoBack) currentPage--;
	}

	// Mobile: Load more items
	function loadMore() {
		const accounts = filteredAccounts();
		if (mobileItemsToShow < accounts.length) {
			mobileItemsToShow = Math.min(mobileItemsToShow + 10, accounts.length);
		}
	}

	// Mobile: Check if we can load more
	const canLoadMore = $derived(() => {
		const accounts = filteredAccounts();
		return mobileItemsToShow < accounts.length;
	});

	// Reset pagination and mobile scroll when search changes
	$effect(() => {
		searchQuery;
		currentPage = 0;
		mobileItemsToShow = 10;
	});

	// Intersection observer for infinite scroll
	$effect(() => {
		if (!loadMoreSentinel) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting && canLoadMore()) {
					loadMore();
				}
			},
			{ threshold: 0.1 }
		);

		observer.observe(loadMoreSentinel);

		return () => {
			observer.disconnect();
		};
	});
</script>

<div class="flex h-full flex-col gap-6 p-4 md:p-6">
	<!-- Header -->
	<div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
		<div>
			<h1 class="text-2xl font-semibold text-foreground">Bank Accounts</h1>
			<p class="text-sm text-muted-foreground">Manage bank accounts and mappings</p>
		</div>
		<Button class="w-full md:w-auto" onclick={openAddDialog}>
			<PlusIcon class="mr-2 size-4" />
			Add Bank Account
		</Button>
	</div>

	<!-- Statistics Cards -->
	<div class="grid grid-cols-2 gap-4 md:grid-cols-4">
		<Card.Root class="py-0">
			<Card.Content class="p-4">
				<div class="text-sm text-muted-foreground">TOTAL ACCOUNTS</div>
				<div class="mt-1 text-2xl font-semibold text-foreground">{data.stats.total}</div>
			</Card.Content>
		</Card.Root>
		<Card.Root class="py-0">
			<Card.Content class="p-4">
				<div class="text-sm text-muted-foreground">MAPPED</div>
				<div class="mt-1 text-2xl font-semibold text-green-400">{data.stats.mapped}</div>
			</Card.Content>
		</Card.Root>
		<Card.Root class="py-0">
			<Card.Content class="p-4">
				<div class="text-sm text-muted-foreground">UNMAPPED</div>
				<div class="mt-1 text-2xl font-semibold text-blue-400">{data.stats.unmapped}</div>
			</Card.Content>
		</Card.Root>
		<Card.Root class="py-0">
			<Card.Content class="p-4">
				<div class="text-sm text-muted-foreground">PARKED</div>
				<div class="mt-1 text-2xl font-semibold text-yellow-400">{data.stats.parked}</div>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Search and Filters -->
	<div class="flex flex-col gap-4 md:flex-row md:items-center">
		<div class="relative flex-1">
			<SearchIcon class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
			<Input
				placeholder="Search accounts by holder, bank, account number..."
				bind:value={searchQuery}
				class="pl-10"
			/>
		</div>

		<!-- Status Filter -->
		<Popover.Root bind:open={statusPopoverOpen}>
			<Popover.Trigger>
				{#snippet child({ props })}
					<Button {...props} variant="outline" class="w-full justify-between md:w-[180px]">
						{statusOptions.find((s) => s.value === statusFilter)?.label || 'All Status'}
						<ChevronDownIcon class="ml-2 size-4 opacity-50" />
					</Button>
				{/snippet}
			</Popover.Trigger>
			<Popover.Content class="w-[180px] p-0">
				<div class="flex flex-col">
					{#each statusOptions as option}
						<button
							type="button"
							class="flex items-center gap-2 px-4 py-2 text-sm hover:bg-accent"
							onclick={() => handleStatusChange(option.value)}
						>
							<CheckIcon
								class="size-4 {statusFilter === option.value ? 'opacity-100' : 'opacity-0'}"
							/>
							{option.label}
						</button>
					{/each}
				</div>
			</Popover.Content>
		</Popover.Root>

		<!-- Added By Filter -->
		<Popover.Root bind:open={addedByPopoverOpen}>
			<Popover.Trigger>
				{#snippet child({ props })}
					<Button {...props} variant="outline" class="w-full justify-between md:w-[180px]">
						{addedByOptions.find((t) => t.value === addedByFilter)?.label || 'All Types'}
						<ChevronDownIcon class="ml-2 size-4 opacity-50" />
					</Button>
				{/snippet}
			</Popover.Trigger>
			<Popover.Content class="w-[180px] p-0">
				<div class="flex flex-col">
					{#each addedByOptions as option}
						<button
							type="button"
							class="flex items-center gap-2 px-4 py-2 text-sm hover:bg-accent"
							onclick={() => handleAddedByChange(option.value)}
						>
							<CheckIcon
								class="size-4 {addedByFilter === option.value ? 'opacity-100' : 'opacity-0'}"
							/>
							{option.label}
						</button>
					{/each}
				</div>
			</Popover.Content>
		</Popover.Root>
	</div>

	<!-- Desktop Table View -->
	<div class="hidden md:block">
		<Card.Root class="py-0">
			<Card.Content class="p-0">
				{#if isLoading}
					<div class="flex items-center justify-center py-24">
						<Spinner class="size-8" />
					</div>
				{:else}
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>Bank Details</Table.Head>
								<Table.Head>Account Holder</Table.Head>
								<Table.Head>Status</Table.Head>
								<Table.Head>Added By</Table.Head>
								<Table.Head>Mapped To</Table.Head>
								<Table.Head>Updated On</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#if paginatedAccounts().length === 0}
								<Table.Row class="cursor-pointer">
									<Table.Cell colspan={6} class="h-24 text-center">
										{searchQuery ? 'No accounts found matching your search.' : 'No accounts found.'}
									</Table.Cell>
								</Table.Row>
							{:else}
								{#each paginatedAccounts() as account (account.id)}
									{@const statusDisplay = getStatusDisplay(account.status)}
									{@const StatusIcon = statusDisplay.icon}
									<Table.Row class="cursor-pointer" onclick={() => openAccountDialog(account)}>
										<Table.Cell>
											<div class="flex items-center gap-3">
												<div class="rounded-lg bg-primary/10 p-2">
													<BuildingIcon class="size-4 text-primary" />
												</div>
												<div class="flex flex-col">
													<div class="font-medium text-foreground">{account.bankName}</div>
													<div class="flex items-center gap-2">
														<div class="font-mono text-xs text-muted-foreground">
															{account.accountNumber}
														</div>
													</div>
												</div>
											</div>
										</Table.Cell>
										<Table.Cell>
											<div class="text-foreground">{account.accountHolderName}</div>
										</Table.Cell>
										<Table.Cell>
											<div class="flex items-center gap-2 {statusDisplay.color}">
												<StatusIcon class="size-4" />
												<span>{statusDisplay.label}</span>
											</div>
										</Table.Cell>
										<Table.Cell>
											<div class="flex flex-col gap-1">
												<span
													class="w-fit rounded-md px-2.5 py-1 text-xs font-medium {getAddedByColor(
														account.addedByType
													)}"
												>
													{account.addedByType.charAt(0).toUpperCase() +
														account.addedByType.slice(1)}
												</span>
												<span class="text-xs text-muted-foreground">{account.addedByUserName}</span>
											</div>
										</Table.Cell>
										<Table.Cell>
											<div class="text-muted-foreground">
												{account.mappedToUserName || 'Not mapped'}
											</div>
										</Table.Cell>
										<Table.Cell>
											<div class="text-muted-foreground">{formatDate(account.updatedAt)}</div>
										</Table.Cell>
									</Table.Row>
								{/each}
							{/if}
						</Table.Body>
					</Table.Root>
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- Pagination -->
		{#if filteredAccounts().length > 0}
			<div class="mt-4 flex items-center justify-between pb-4">
				<div class="text-sm text-muted-foreground">
					Showing {currentPage * pageSize + 1} to {Math.min(
						(currentPage + 1) * pageSize,
						filteredAccounts().length
					)} of {filteredAccounts().length} accounts
				</div>
				<div class="flex gap-2">
					<Button variant="outline" size="sm" disabled={!canGoBack} onclick={previousPage}>
						Previous
					</Button>
					<Button variant="outline" size="sm" disabled={!canGoForward} onclick={nextPage}>
						Next
					</Button>
				</div>
			</div>
		{/if}
	</div>

	<!-- Mobile Card View with Infinite Scroll -->
	<div class="flex flex-col gap-4 md:hidden">
		{#if isLoading}
			<Card.Root class="py-0">
				<Card.Content class="flex items-center justify-center py-24">
					<Spinner class="size-8" />
				</Card.Content>
			</Card.Root>
		{:else if mobileAccounts().length === 0}
			<Card.Root class="py-0">
				<Card.Content class="p-8 text-center">
					<WalletIcon class="mx-auto mb-2 size-8 text-muted-foreground" />
					<p class="text-muted-foreground">
						{searchQuery ? 'No accounts found matching your search.' : 'No accounts found.'}
					</p>
				</Card.Content>
			</Card.Root>
		{:else}
			{#each mobileAccounts() as account (account.id)}
				{@const statusDisplay = getStatusDisplay(account.status)}
				{@const StatusIcon = statusDisplay.icon}
				<Card.Root class="cursor-pointer py-0" onclick={() => openAccountDialog(account)}>
					<Card.Content class="p-4">
						<div class="flex flex-col gap-3">
							<!-- Bank Details -->
							<div class="flex items-center gap-3">
								<div class="rounded-lg bg-primary/10 p-2">
									<BuildingIcon class="size-4 text-primary" />
								</div>
								<div class="min-w-0 flex-1">
									<div class="truncate font-medium text-foreground">{account.bankName}</div>
									<div class="truncate font-mono text-xs text-muted-foreground">
										{account.accountNumber}
									</div>
								</div>
							</div>

							<!-- Account Holder -->
							<div>
								<div class="text-xs text-muted-foreground">Account Holder</div>
								<div class="text-sm font-medium text-foreground">{account.accountHolderName}</div>
							</div>

							<!-- Status and Added By -->
							<div class="flex flex-wrap items-center gap-2">
								<div class="flex items-center gap-1.5 {statusDisplay.color}">
									<StatusIcon class="size-4" />
									<span class="text-sm">{statusDisplay.label}</span>
								</div>
								<span
									class="rounded-md px-2.5 py-1 text-xs font-medium {getAddedByColor(
										account.addedByType
									)}"
								>
									{account.addedByType.charAt(0).toUpperCase() + account.addedByType.slice(1)}
								</span>
							</div>

							<!-- Mapped To -->
							<div>
								<div class="text-xs text-muted-foreground">Mapped To</div>
								<div class="text-sm text-foreground">
									{account.mappedToUserName || 'Not mapped'}
								</div>
							</div>

							<!-- Updated On -->
							<div class="text-xs text-muted-foreground">
								Updated: {formatDate(account.updatedAt)}
							</div>
						</div>
					</Card.Content>
				</Card.Root>
			{/each}

			<!-- Loading indicator / sentinel for infinite scroll -->
			{#if canLoadMore()}
				<div bind:this={loadMoreSentinel} class="flex items-center justify-center py-4">
					<div class="text-sm text-muted-foreground">Loading more...</div>
				</div>
			{:else if filteredAccounts().length > 10}
				<div class="flex items-center justify-center py-4">
					<div class="text-sm text-muted-foreground">
						Showing all {filteredAccounts().length} accounts
					</div>
				</div>
			{/if}
		{/if}
	</div>

	<!-- Edit Account Dialog -->
	<Dialog.Root bind:open={editDialogOpen}>
		<Dialog.Content class="max-w-lg">
			<Dialog.Header>
				<Dialog.Title>Bank Account Details</Dialog.Title>
				<Dialog.Description>View and edit bank account information</Dialog.Description>
			</Dialog.Header>

			{#if selectedAccount}
				{@const statusDisplay = getStatusDisplay(selectedAccount.status)}
				{@const StatusIcon = statusDisplay.icon}
				<div class="space-y-4 py-4">
					<!-- Account Details -->
					<div class="space-y-3">
						<div>
							<div class="text-sm font-medium text-muted-foreground">Bank Name</div>
							<div class="mt-1 text-base text-foreground">{selectedAccount.bankName}</div>
						</div>

						<div>
							<div class="text-sm font-medium text-muted-foreground">Account Holder</div>
							<div class="mt-1 text-base text-foreground">{selectedAccount.accountHolderName}</div>
						</div>

						<!-- Sensitive Information Section with Global Reveal -->
						{#if canAttemptReveal}
							<div class="rounded-lg border border-border bg-muted/30 p-4">
								<div class="mb-3 flex items-center justify-between">
									<h4 class="text-sm font-semibold text-foreground">Sensitive Information</h4>
									<button
										type="button"
										onclick={isRevealed ? hideAccountData : revealAccountData}
										disabled={isRevealing}
										class="flex items-center gap-2 rounded px-3 py-1.5 text-sm transition-colors {isRevealed
											? 'bg-muted text-muted-foreground hover:bg-muted/80'
											: 'bg-primary text-primary-foreground hover:bg-primary/90'}"
										title={isRevealed ? 'Hide sensitive details' : 'Reveal sensitive details'}
									>
										{#if isRevealing}
											<Spinner class="size-4" />
											<span>Revealing...</span>
										{:else if isRevealed}
											<EyeOffIcon class="size-4" />
											<span>Hide</span>
										{:else}
											<EyeIcon class="size-4" />
											<span>Reveal</span>
										{/if}
									</button>
								</div>

								<div class="grid grid-cols-2 gap-4">
									<div>
										<div class="text-xs font-medium text-muted-foreground">Account Number</div>
										<div class="mt-1 font-mono text-sm text-foreground">
											{revealedAccountNumber || selectedAccount.accountNumber}
										</div>
									</div>
									<div>
										<div class="text-xs font-medium text-muted-foreground">IFSC Code</div>
										<div class="mt-1 font-mono text-sm text-foreground">
											{revealedIfscCode || selectedAccount.ifscCode}
										</div>
									</div>
								</div>
							</div>
						{:else}
							<div class="grid grid-cols-2 gap-4">
								<div>
									<div class="text-sm font-medium text-muted-foreground">Account Number</div>
									<div class="mt-1 font-mono text-sm text-foreground">
										{selectedAccount.accountNumber}
									</div>
								</div>
								<div>
									<div class="text-sm font-medium text-muted-foreground">IFSC Code</div>
									<div class="mt-1 font-mono text-sm text-foreground">
										{selectedAccount.ifscCode}
									</div>
								</div>
							</div>
						{/if}

						<div class="grid grid-cols-2 gap-4">
							<div>
								<div class="text-sm font-medium text-muted-foreground">Added By</div>
								<div class="mt-1 text-sm text-foreground">
									<span
										class="inline-block rounded-md px-2.5 py-1 text-xs font-medium {getAddedByColor(
											selectedAccount.addedByType
										)}"
									>
										{selectedAccount.addedByType.charAt(0).toUpperCase() +
											selectedAccount.addedByType.slice(1)}
									</span>
									<div class="mt-1 text-xs text-muted-foreground">
										{selectedAccount.addedByUserName}
									</div>
								</div>
							</div>
							<div>
								<div class="text-sm font-medium text-muted-foreground">Current Status</div>
								<div class="mt-1 text-sm">
									<div class="flex items-center gap-1.5 {statusDisplay.color}">
										<StatusIcon class="size-4" />
										<span>{statusDisplay.label}</span>
									</div>
								</div>
							</div>
						</div>

						<div>
							<div class="text-sm font-medium text-muted-foreground">Account ID</div>
							<div class="mt-1 font-mono text-xs text-muted-foreground">{selectedAccount.id}</div>
						</div>

						<div class="grid grid-cols-2 gap-4">
							<div>
								<div class="text-sm font-medium text-muted-foreground">Created</div>
								<div class="mt-1 text-xs text-foreground">{formatDate(selectedAccount.createdAt)}</div>
							</div>
							<div>
								<div class="text-sm font-medium text-muted-foreground">Last Updated</div>
								<div class="mt-1 text-xs text-foreground">{formatDate(selectedAccount.updatedAt)}</div>
							</div>
						</div>
					</div>

					<div class="border-t pt-4">
						<h4 class="mb-3 text-sm font-semibold">Actions</h4>

						<!-- Status Selection -->
						<div class="mb-4">
							<div class="mb-2 text-sm font-medium text-muted-foreground">Change Status</div>
							<div class="flex gap-2">
								{#each statusOptions.filter((s) => s.value !== 'all') as option}
									<button
										type="button"
										class="flex-1 rounded-md border px-3 py-2 text-sm transition-colors {editingStatus ===
										option.value
											? 'border-primary bg-primary text-primary-foreground'
											: 'border-input bg-background hover:bg-accent'}"
										onclick={() => (editingStatus = option.value)}
									>
										{option.label}
									</button>
								{/each}
							</div>
						</div>

						<!-- Merchant Mapping -->
						<div>
							<div class="mb-2 text-sm font-medium text-muted-foreground">Map to Merchant</div>
							{#if isLoadingMerchants}
								<div class="flex items-center justify-center py-4">
									<Spinner class="size-4" />
								</div>
							{:else if merchants.length === 0}
								<div class="rounded-md border border-dashed p-4 text-center">
									<p class="text-sm text-muted-foreground">No merchants available</p>
								</div>
							{:else}
								<Button
									variant="outline"
									class="w-full justify-start"
									onclick={() => (merchantCommandOpen = true)}
								>
									{#if editingMappedToUserId}
										<CheckCircle2Icon class="mr-2 size-4 text-green-500" />
									{:else}
										<UserIcon class="mr-2 size-4" />
									{/if}
									<span class="truncate">{getSelectedMerchantName()}</span>
									<ChevronDownIcon class="ml-auto size-4 opacity-50" />
								</Button>
							{/if}
						</div>
					</div>
				</div>

				<Dialog.Footer>
					<Button variant="outline" onclick={closeEditDialog} disabled={isSaving}>Cancel</Button>
					<Button
						onclick={saveAccount}
						disabled={isSaving ||
							(editingStatus === selectedAccount.status &&
								editingMappedToUserId === selectedAccount.mappedToUserId)}
					>
						{#if isSaving}
							<Spinner class="mr-2 size-4" />
							Saving...
						{:else}
							Save Changes
						{/if}
					</Button>
				</Dialog.Footer>
			{/if}
		</Dialog.Content>
	</Dialog.Root>

	<!-- Merchant Selection Command Dialog -->
	<Command.Dialog bind:open={merchantCommandOpen}>
		<Command.Input placeholder="Search merchants..." />
		<Command.List>
			<Command.Empty>No merchants found.</Command.Empty>
			<Command.Group heading="Merchants">
				<!-- Not Mapped option -->
				<Command.Item
					value="not-mapped"
					onSelect={() => selectMerchant(null)}
					class={editingMappedToUserId === null ? 'bg-accent' : ''}
				>
					<div class="flex items-center gap-2">
						{#if editingMappedToUserId === null}
							<CheckIcon class="size-4 text-primary" />
						{:else}
							<div class="size-4"></div>
						{/if}
						<span>Not Mapped</span>
					</div>
				</Command.Item>

				<!-- Merchant list -->
				{#each merchants as merchant}
					<Command.Item
						value={merchant.fullName}
						onSelect={() => selectMerchant(merchant.id)}
						class={editingMappedToUserId === merchant.id ? 'bg-accent' : ''}
					>
						<div class="flex items-center gap-2">
							{#if editingMappedToUserId === merchant.id}
								<CheckIcon class="size-4 text-primary" />
							{:else}
								<div class="size-4"></div>
							{/if}
							<UserIcon class="size-4 text-muted-foreground" />
							<span>{merchant.fullName}</span>
						</div>
					</Command.Item>
				{/each}
			</Command.Group>
		</Command.List>
	</Command.Dialog>

	<!-- Add Bank Account Dialog -->
	<Dialog.Root bind:open={addDialogOpen}>
		<Dialog.Content class="max-w-xl max-h-[90vh] overflow-y-auto">
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
						<span
							class="rounded-md px-2.5 py-1 text-xs font-medium {getUserTypeColor(data.user.type)}"
						>
							{data.user.type.charAt(0).toUpperCase() + data.user.type.slice(1)}
						</span>
					</div>
					</div>
				</div>

				<!-- Status -->
				<div>
					<!-- svelte-ignore a11y_label_has_associated_control -->
					<label class="text-sm font-medium">
						Status <span class="text-destructive">*</span>
					</label>
					<div class="mt-2 flex gap-2">
						{#each statusOptions.filter((s) => s.value !== 'all') as option}
							<button
								type="button"
								class="flex-1 rounded-md border px-3 py-2 text-sm transition-colors {newAccountForm.status ===
								option.value
									? 'border-primary bg-primary text-primary-foreground'
									: 'border-input bg-background hover:bg-accent'}"
								onclick={() => (newAccountForm.status = option.value as any)}
							>
								{option.label}
							</button>
						{/each}
					</div>
				</div>

				<!-- Map to Merchant (only if status is mapped) -->
				{#if newAccountForm.status === 'mapped'}
					<div>
						<!-- svelte-ignore a11y_label_has_associated_control -->
						<label class="text-sm font-medium">
							Map to Merchant <span class="text-destructive">*</span>
						</label>
						<select
							bind:value={newAccountForm.mappedToUserId}
							class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
						>
							<option value={null}>Select merchant...</option>
							{#each merchants as merchant}
								<option value={merchant.id}>{merchant.fullName}</option>
							{/each}
						</select>
					</div>
				{/if}
			</div>

			<Dialog.Footer>
				<Button variant="outline" onclick={closeAddDialog} disabled={isCreating}>Cancel</Button>
				<Button onclick={createBankAccount} disabled={isCreating}>
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
</div>

