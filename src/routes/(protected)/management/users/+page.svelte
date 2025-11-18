<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Table from '$lib/components/ui/table';
	import * as Popover from '$lib/components/ui/popover';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Spinner } from '$lib/components/ui/spinner';
	import { PhoneInput } from '$lib/components/ui/phone-input';
	import type { PageData } from './$types';
	import UserPlusIcon from '@lucide/svelte/icons/user-plus';
	import SearchIcon from '@lucide/svelte/icons/search';
	import CheckCircle2Icon from '@lucide/svelte/icons/check-circle-2';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import XCircleIcon from '@lucide/svelte/icons/x-circle';
	import UsersIcon from '@lucide/svelte/icons/users';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import CheckIcon from '@lucide/svelte/icons/check';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import { toast } from 'svelte-sonner';

	type User = {
		id: string;
		email: string;
		fullName: string;
		type: 'management' | 'holder' | 'merchant' | 'unassigned';
		status: 'pending' | 'approved' | 'suspended';
		createdAt: string;
		updatedAt: string;
	};

	let { data }: { data: PageData } = $props();

	// Search state
	let searchQuery = $state('');

	// Filter state - read from server data
	let statusFilter = $state(data.filters?.status || 'all');
	let typeFilter = $state(data.filters?.type || 'all');
	let isLoading = $state(false);
	let statusPopoverOpen = $state(false);
	let typePopoverOpen = $state(false);

	// Edit User Dialog state
	let editDialogOpen = $state(false);
	let selectedUser: User | null = $state(null);
	let editingStatus = $state('');
	let editingType = $state('');
	let isSaving = $state(false);

	// Add User Dialog state
	let addDialogOpen = $state(false);
	let newUserForm = $state({
		fullName: '',
		email: '',
		phoneNumber: '',
		password: '',
		type: 'unassigned' as 'management' | 'merchant' | 'holder' | 'unassigned',
		status: 'pending' as 'pending' | 'approved' | 'suspended'
	});
	let isCreating = $state(false);

	// Pagination state (desktop only)
	let currentPage = $state(0);
	let pageSize = $state(10);

	// Infinite scroll state (mobile only)
	let mobileItemsToShow = $state(10);
	let loadMoreSentinel: HTMLElement | null = $state(null);

	// Filter options
	const statusOptions = [
		{ value: 'all', label: 'All Status' },
		{ value: 'approved', label: 'Approved' },
		{ value: 'pending', label: 'Pending' },
		{ value: 'suspended', label: 'Suspended' }
	];

	const typeOptions = [
		{ value: 'all', label: 'All Types' },
		{ value: 'management', label: 'Management' },
		{ value: 'merchant', label: 'Merchant' },
		{ value: 'holder', label: 'Holder' },
		{ value: 'unassigned', label: 'Unassigned' }
	];

	// Handle status filter change
	async function handleStatusChange(value: string) {
		statusFilter = value;
		statusPopoverOpen = false;
		await applyFilters();
	}

	// Handle type filter change
	async function handleTypeChange(value: string) {
		typeFilter = value;
		typePopoverOpen = false;
		await applyFilters();
	}

	// Apply filters - make API call
	async function applyFilters() {
		isLoading = true;
		const params = new URLSearchParams();
		
		if (statusFilter !== 'all') {
			params.set('status', statusFilter);
		}
		
		if (typeFilter !== 'all') {
			params.set('type', typeFilter);
		}

		const queryString = params.toString();
		await goto(queryString ? `?${queryString}` : window.location.pathname, {
			keepFocus: true,
			noScroll: true,
			replaceState: false
		});
		isLoading = false;
	}

	// Open user details dialog
	function openUserDialog(user: User) {
		selectedUser = user;
		editingStatus = user.status;
		editingType = user.type;
		editDialogOpen = true;
	}

	// Close edit dialog
	function closeEditDialog() {
		editDialogOpen = false;
		selectedUser = null;
		editingStatus = '';
		editingType = '';
	}

	// Open add user dialog
	function openAddDialog() {
		addDialogOpen = true;
		// Reset form
		newUserForm = {
			fullName: '',
			email: '',
			phoneNumber: '',
			password: '',
			type: 'unassigned',
			status: 'pending'
		};
	}

	// Close add user dialog
	function closeAddDialog() {
		addDialogOpen = false;
		newUserForm = {
			fullName: '',
			email: '',
			phoneNumber: '',
			password: '',
			type: 'unassigned',
			status: 'pending'
		};
	}

	// Save user changes
	async function saveUser() {
		if (!selectedUser) return;

		isSaving = true;
		try {
			const response = await fetch('/api/users/update', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					userId: selectedUser.id,
					status: editingStatus,
					type: editingType
				})
			});

			if (!response.ok) {
				throw new Error('Failed to update user');
			}

			toast.success('User updated successfully');
			closeEditDialog();
			await invalidateAll(); // Refresh data
		} catch (error) {
			console.error('Error updating user:', error);
			toast.error('Failed to update user');
		} finally {
			isSaving = false;
		}
	}

	// Create new user
	async function createUser() {
		// Validate form
		if (!newUserForm.fullName.trim()) {
			toast.error('Full name is required');
			return;
		}
		if (!newUserForm.email.trim()) {
			toast.error('Email is required');
			return;
		}
		if (!newUserForm.password.trim() || newUserForm.password.length < 6) {
			toast.error('Password must be at least 6 characters');
			return;
		}

		isCreating = true;
		try {
			const response = await fetch('/api/users/create', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(newUserForm)
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || 'Failed to create user');
			}

			toast.success('User created successfully');
			closeAddDialog();
			await invalidateAll(); // Refresh data
		} catch (error) {
			console.error('Error creating user:', error);
			toast.error(error instanceof Error ? error.message : 'Failed to create user');
		} finally {
			isCreating = false;
		}
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

	// Get type color
	function getTypeColor(type: string): string {
		switch (type) {
			case 'management':
				return 'bg-purple-500/20 text-purple-400';
			case 'merchant':
				return 'bg-teal-500/20 text-teal-400';
			case 'holder':
				return 'bg-blue-500/20 text-blue-400';
			default:
				return 'bg-gray-500/20 text-gray-400';
		}
	}

	// Get status icon and color
	function getStatusDisplay(status: string) {
		switch (status) {
			case 'approved':
				return {
					icon: CheckCircle2Icon,
					color: 'text-green-400',
					label: 'Approved'
				};
			case 'pending':
				return {
					icon: ClockIcon,
					color: 'text-yellow-400',
					label: 'Pending'
				};
			case 'suspended':
				return {
					icon: XCircleIcon,
					color: 'text-red-400',
					label: 'Suspended'
				};
			default:
				return {
					icon: ClockIcon,
					color: 'text-gray-400',
					label: status
				};
		}
	}

	// Filter users based on search
	const filteredUsers = $derived(() => {
		if (!data.users) return [];
		if (!searchQuery.trim()) return data.users;

		const query = searchQuery.toLowerCase();
		return data.users.filter(
			(user: User) =>
				user.fullName.toLowerCase().includes(query) || user.email.toLowerCase().includes(query)
		);
	});

	// Paginated users (desktop)
	const paginatedUsers = $derived(() => {
		const users = filteredUsers();
		const start = currentPage * pageSize;
		const end = start + pageSize;
		return users.slice(start, end);
	});

	// Mobile infinite scroll users
	const mobileUsers = $derived(() => {
		const users = filteredUsers();
		return users.slice(0, mobileItemsToShow);
	});

	// Pagination helpers (desktop)
	const totalPages = $derived(Math.ceil((filteredUsers()?.length || 0) / pageSize));
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
		const users = filteredUsers();
		if (mobileItemsToShow < users.length) {
			mobileItemsToShow = Math.min(mobileItemsToShow + 10, users.length);
		}
	}

	// Mobile: Check if we can load more
	const canLoadMore = $derived(() => {
		const users = filteredUsers();
		return mobileItemsToShow < users.length;
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
			<h1 class="text-2xl font-semibold text-foreground">Users</h1>
			<p class="text-sm text-muted-foreground">Manage user accounts and permissions</p>
		</div>
		<Button class="w-full md:w-auto" onclick={openAddDialog}>
			<UserPlusIcon class="mr-2 size-4" />
			Add User
		</Button>
	</div>

	<!-- Statistics Cards -->
	<div class="grid grid-cols-2 gap-4 md:grid-cols-4">
		<Card.Root class="py-0">
			<Card.Content class="p-4">
				<div class="text-sm text-muted-foreground">TOTAL USERS</div>
				<div class="mt-1 text-2xl font-semibold text-foreground">{data.stats.total}</div>
			</Card.Content>
		</Card.Root>
		<Card.Root class="py-0">
			<Card.Content class="p-4">
				<div class="text-sm text-muted-foreground">APPROVED</div>
				<div class="mt-1 text-2xl font-semibold text-green-400">{data.stats.approved}</div>
			</Card.Content>
		</Card.Root>
		<Card.Root class="py-0">
			<Card.Content class="p-4">
				<div class="text-sm text-muted-foreground">PENDING</div>
				<div class="mt-1 text-2xl font-semibold text-yellow-400">{data.stats.pending}</div>
			</Card.Content>
		</Card.Root>
		<Card.Root class="py-0">
			<Card.Content class="p-4">
				<div class="text-sm text-muted-foreground">SUSPENDED</div>
				<div class="mt-1 text-2xl font-semibold text-red-400">{data.stats.suspended}</div>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Search and Filters -->
	<div class="flex flex-col gap-4 md:flex-row md:items-center">
		<div class="relative flex-1">
			<SearchIcon class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
			<Input
				placeholder="Search users by name or email..."
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

		<!-- Type Filter -->
		<Popover.Root bind:open={typePopoverOpen}>
			<Popover.Trigger>
				{#snippet child({ props })}
					<Button {...props} variant="outline" class="w-full justify-between md:w-[180px]">
						{typeOptions.find((t) => t.value === typeFilter)?.label || 'All Types'}
						<ChevronDownIcon class="ml-2 size-4 opacity-50" />
					</Button>
				{/snippet}
			</Popover.Trigger>
			<Popover.Content class="w-[180px] p-0">
				<div class="flex flex-col">
					{#each typeOptions as option}
						<button
							type="button"
							class="flex items-center gap-2 px-4 py-2 text-sm hover:bg-accent"
							onclick={() => handleTypeChange(option.value)}
						>
							<CheckIcon
								class="size-4 {typeFilter === option.value ? 'opacity-100' : 'opacity-0'}"
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
							<Table.Head>User</Table.Head>
							<Table.Head>Type</Table.Head>
							<Table.Head>Status</Table.Head>
							<Table.Head>Joined Date</Table.Head>
							<Table.Head>Updated At</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#if paginatedUsers().length === 0}
							<Table.Row class="cursor-pointer">
								<Table.Cell colspan={5} class="h-24 text-center">
									{searchQuery ? 'No users found matching your search.' : 'No users found.'}
								</Table.Cell>
							</Table.Row>
						{:else}
							{#each paginatedUsers() as user (user.id)}
								{@const statusDisplay = getStatusDisplay(user.status)}
								{@const StatusIcon = statusDisplay.icon}
								<Table.Row class="cursor-pointer" onclick={() => openUserDialog(user)}>
									<Table.Cell>
										<div class="flex flex-col">
											<div class="font-medium text-foreground">{user.fullName}</div>
											<div class="text-sm text-muted-foreground">{user.email}</div>
										</div>
									</Table.Cell>
									<Table.Cell>
										<span class="rounded-md px-2.5 py-1 text-xs font-medium {getTypeColor(user.type)}">
											{user.type.charAt(0).toUpperCase() + user.type.slice(1)}
										</span>
									</Table.Cell>
									<Table.Cell>
										<div class="flex items-center gap-2 {statusDisplay.color}">
											<StatusIcon class="size-4" />
											<span>{statusDisplay.label}</span>
										</div>
									</Table.Cell>
									<Table.Cell>
										<div class="text-muted-foreground">{formatDate(user.createdAt)}</div>
									</Table.Cell>
									<Table.Cell>
										<div class="text-muted-foreground">{formatDate(user.updatedAt)}</div>
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
		{#if filteredUsers().length > 0}
			<div class="mt-4 pb-4 flex items-center justify-between">
				<div class="text-sm text-muted-foreground">
					Showing {currentPage * pageSize + 1} to {Math.min(
						(currentPage + 1) * pageSize,
						filteredUsers().length
					)} of {filteredUsers().length} users
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
		{:else if mobileUsers().length === 0}
			<Card.Root class="py-0">
				<Card.Content class="p-8 text-center">
					<UsersIcon class="mx-auto mb-2 size-8 text-muted-foreground" />
					<p class="text-muted-foreground">
						{searchQuery ? 'No users found matching your search.' : 'No users found.'}
					</p>
				</Card.Content>
			</Card.Root>
		{:else}
			{#each mobileUsers() as user (user.id)}
				{@const statusDisplay = getStatusDisplay(user.status)}
				{@const StatusIcon = statusDisplay.icon}
				<Card.Root class="cursor-pointer py-0" onclick={() => openUserDialog(user)}>
					<Card.Content class="p-4">
						<div class="flex flex-col gap-3">
							<div>
								<div class="font-medium text-foreground">{user.fullName}</div>
								<div class="text-sm text-muted-foreground">{user.email}</div>
							</div>
							<div class="flex flex-wrap items-center gap-2">
								<span class="rounded-md px-2.5 py-1 text-xs font-medium {getTypeColor(user.type)}">
									{user.type.charAt(0).toUpperCase() + user.type.slice(1)}
								</span>
								<div class="flex items-center gap-1.5 {statusDisplay.color}">
									<StatusIcon class="size-4" />
									<span class="text-sm">{statusDisplay.label}</span>
								</div>
							</div>
							<div class="flex flex-col gap-1 text-xs text-muted-foreground">
								<div>Joined: {formatDate(user.createdAt)}</div>
								<div>Updated: {formatDate(user.updatedAt)}</div>
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
			{:else if filteredUsers().length > 10}
				<div class="flex items-center justify-center py-4">
					<div class="text-sm text-muted-foreground">
						Showing all {filteredUsers().length} users
					</div>
				</div>
			{/if}
		{/if}
	</div>

	<!-- Edit User Dialog -->
	<Dialog.Root bind:open={editDialogOpen}>
		<Dialog.Content class="max-w-md">
			<Dialog.Header>
				<Dialog.Title>User Details</Dialog.Title>
				<Dialog.Description>View and edit user information</Dialog.Description>
			</Dialog.Header>

			{#if selectedUser}
				<div class="space-y-4 py-4">
					<!-- User Info -->
					<div class="space-y-3">
						<div>
							<div class="text-sm font-medium text-muted-foreground">Full Name</div>
							<div class="mt-1 text-base text-foreground">{selectedUser.fullName}</div>
						</div>

						<div>
							<div class="text-sm font-medium text-muted-foreground">Email</div>
							<div class="mt-1 text-base text-foreground">{selectedUser.email}</div>
						</div>

						<div>
							<div class="text-sm font-medium text-muted-foreground">User ID</div>
							<div class="mt-1 font-mono text-xs text-muted-foreground">{selectedUser.id}</div>
						</div>

						<div class="grid grid-cols-2 gap-4">
							<div>
								<div class="text-sm font-medium text-muted-foreground">Joined Date</div>
								<div class="mt-1 text-sm text-foreground">{formatDate(selectedUser.createdAt)}</div>
							</div>
							<div>
								<div class="text-sm font-medium text-muted-foreground">Last Updated</div>
								<div class="mt-1 text-sm text-foreground">{formatDate(selectedUser.updatedAt)}</div>
							</div>
						</div>
					</div>

					<div class="border-t pt-4">
						<h4 class="mb-3 text-sm font-semibold">Actions</h4>

						<!-- Status Selection -->
						<div class="mb-3">
							<div class="text-sm font-medium text-muted-foreground">Status</div>
							<div class="mt-2 flex gap-2">
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

						<!-- Type Selection -->
						<div>
							<div class="text-sm font-medium text-muted-foreground">User Type</div>
							<div class="mt-2 grid grid-cols-2 gap-2">
								{#each typeOptions.filter((t) => t.value !== 'all') as option}
									<button
										type="button"
										class="rounded-md border px-3 py-2 text-sm transition-colors {editingType ===
										option.value
											? 'border-primary bg-primary text-primary-foreground'
											: 'border-input bg-background hover:bg-accent'}"
										onclick={() => (editingType = option.value)}
									>
										{option.label}
									</button>
								{/each}
							</div>
						</div>
					</div>
				</div>

				<Dialog.Footer>
					<Button variant="outline" onclick={closeEditDialog} disabled={isSaving}>Cancel</Button>
					<Button
						onclick={saveUser}
						disabled={isSaving ||
							(editingStatus === selectedUser.status && editingType === selectedUser.type)}
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

	<!-- Add User Dialog -->
	<Dialog.Root bind:open={addDialogOpen}>
		<Dialog.Content class="max-w-md">
			<Dialog.Header>
				<Dialog.Title>Create New User</Dialog.Title>
				<Dialog.Description>Add a new user to the system</Dialog.Description>
			</Dialog.Header>

			<div class="space-y-4 py-4">
				<!-- Full Name -->
				<div class="space-y-2">
					<label for="fullName" class="text-sm font-medium">
						Full Name <span class="text-destructive">*</span>
					</label>
					<Input
						id="fullName"
						placeholder="John Doe"
						bind:value={newUserForm.fullName}
						disabled={isCreating}
					/>
				</div>

				<!-- Email -->
				<div class="space-y-2">
					<label for="email" class="text-sm font-medium">
						Email <span class="text-destructive">*</span>
					</label>
					<Input
						id="email"
						type="email"
						placeholder="john.doe@example.com"
						bind:value={newUserForm.email}
						disabled={isCreating}
					/>
				</div>

				<!-- Phone Number -->
				<div class="space-y-2">
					<div class="text-sm font-medium">Phone Number</div>
					<PhoneInput
						bind:value={newUserForm.phoneNumber}
						disabled={isCreating}
						placeholder="Enter phone number"
					/>
				</div>

				<!-- Password -->
				<div class="space-y-2">
					<label for="password" class="text-sm font-medium">
						Password <span class="text-destructive">*</span>
					</label>
					<Input
						id="password"
						type="password"
						placeholder="Min. 6 characters"
						bind:value={newUserForm.password}
						disabled={isCreating}
					/>
				</div>

				<!-- User Type -->
				<div class="space-y-2">
					<div class="text-sm font-medium">User Type</div>
					<div class="grid grid-cols-2 gap-2">
						{#each typeOptions.filter((t) => t.value !== 'all') as option}
							<button
								type="button"
								class="rounded-md border px-3 py-2 text-sm transition-colors {newUserForm.type ===
								option.value
									? 'border-primary bg-primary text-primary-foreground'
									: 'border-input bg-background hover:bg-accent'}"
								onclick={() => (newUserForm.type = option.value as any)}
								disabled={isCreating}
							>
								{option.label}
							</button>
						{/each}
					</div>
				</div>

				<!-- User Status -->
				<div class="space-y-2">
					<div class="text-sm font-medium">User Status</div>
					<div class="flex gap-2">
						{#each statusOptions.filter((s) => s.value !== 'all') as option}
							<button
								type="button"
								class="flex-1 rounded-md border px-3 py-2 text-sm transition-colors {newUserForm.status ===
								option.value
									? 'border-primary bg-primary text-primary-foreground'
									: 'border-input bg-background hover:bg-accent'}"
								onclick={() => (newUserForm.status = option.value as any)}
								disabled={isCreating}
							>
								{option.label}
							</button>
						{/each}
					</div>
				</div>
			</div>

			<Dialog.Footer>
				<Button variant="outline" onclick={closeAddDialog} disabled={isCreating}>Cancel</Button>
				<Button onclick={createUser} disabled={isCreating}>
					{#if isCreating}
						<Spinner class="mr-2 size-4" />
						Creating...
					{:else}
						<UserPlusIcon class="mr-2 size-4" />
						Create User
					{/if}
				</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>
</div>
