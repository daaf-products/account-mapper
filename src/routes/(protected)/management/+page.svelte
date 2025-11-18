<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import * as Empty from '$lib/components/ui/empty';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Spinner } from '$lib/components/ui/spinner';
	import WalletIcon from '@lucide/svelte/icons/wallet';
	import UsersIcon from '@lucide/svelte/icons/users';
	import ArrowUpRightIcon from '@lucide/svelte/icons/arrow-up-right';
	import * as Chart from '$lib/components/ui/chart/index.js';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import UserCheckIcon from '@lucide/svelte/icons/user-check';
	import BuildingIcon from '@lucide/svelte/icons/building';
	import CheckCircleIcon from '@lucide/svelte/icons/check-circle';
	import XCircleIcon from '@lucide/svelte/icons/x-circle';
	import UserIcon from '@lucide/svelte/icons/user';
	import MailIcon from '@lucide/svelte/icons/mail';
	import type { PageData } from './$types';
	import { PieChart } from 'layerchart';
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';

	type PendingUser = {
		id: string;
		email: string;
		fullName: string;
		type: string;
		status: string;
		createdAt: string;
		timeAgo: string;
	};

	let { data }: { data: PageData } = $props();

	// Dialog state for editing pending users
	let editDialogOpen = $state(false);
	let selectedUser: PendingUser | null = $state(null);
	let editingStatus = $state('');
	let editingType = $state('');
	let isSaving = $state(false);

	// Dialog state for mapping requests
	let requestDialogOpen = $state(false);
	let selectedRequest = $state<(typeof data.pendingRequests)[0] | null>(null);
	let isProcessingRequest = $state(false);

	// Filter options
	const statusOptions = [
		{ value: 'approved', label: 'Approved' },
		{ value: 'pending', label: 'Pending' },
		{ value: 'suspended', label: 'Suspended' }
	];

	const typeOptions = [
		{ value: 'management', label: 'Management' },
		{ value: 'merchant', label: 'Merchant' },
		{ value: 'holder', label: 'Holder' },
		{ value: 'unassigned', label: 'Unassigned' }
	];

	// Open user details dialog
	function openUserDialog(user: PendingUser) {
		selectedUser = user;
		editingStatus = user.status;
		editingType = user.type;
		editDialogOpen = true;
	}

	// Close dialog
	function closeEditDialog() {
		editDialogOpen = false;
		selectedUser = null;
		editingStatus = '';
		editingType = '';
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

	// Open request dialog
	function openRequestDialog(request: (typeof data.pendingRequests)[0]) {
		selectedRequest = request;
		requestDialogOpen = true;
	}

	// Close request dialog
	function closeRequestDialog() {
		requestDialogOpen = false;
		selectedRequest = null;
	}

	// Handle approve request
	async function handleApproveRequest() {
		if (!selectedRequest) return;

		isProcessingRequest = true;
		try {
			const response = await fetch('/api/requests/update', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ requestId: selectedRequest.id, status: 'approved' })
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to approve request');
			}

			toast.success('Request approved successfully');
			closeRequestDialog();
			await invalidateAll();
		} catch (error) {
			console.error('Error approving request:', error);
			toast.error(error instanceof Error ? error.message : 'Failed to approve request');
		} finally {
			isProcessingRequest = false;
		}
	}

	// Handle reject request
	async function handleRejectRequest() {
		if (!selectedRequest) return;

		isProcessingRequest = true;
		try {
			const response = await fetch('/api/requests/update', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ requestId: selectedRequest.id, status: 'rejected' })
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to reject request');
			}

			toast.success('Request rejected successfully');
			closeRequestDialog();
			await invalidateAll();
		} catch (error) {
			console.error('Error rejecting request:', error);
			toast.error(error instanceof Error ? error.message : 'Failed to reject request');
		} finally {
			isProcessingRequest = false;
		}
	}

	// Format date helper
	function formatDate(dateString: string | undefined): string {
		if (!dateString) return 'N/A';
		const date = new Date(dateString);
		if (isNaN(date.getTime())) return 'Invalid Date';
		return date.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	// Get user type color
	function getUserTypeColor(type: string) {
		switch (type) {
			case 'management':
				return 'bg-orange-500/20 text-orange-400';
			case 'merchant':
				return 'bg-purple-500/20 text-purple-400';
			case 'holder':
				return 'bg-teal-500/20 text-teal-400';
			case 'unassigned':
			default:
				return 'bg-amber-500/20 text-amber-400';
		}
	}

	// Format user type label
	function formatUserType(type: string): string {
		return type.charAt(0).toUpperCase() + type.slice(1);
	}

	// Mock data - will be replaced with real data later
	const metrics = {
		totalAccounts: 85,
		pendingUsers: data.pendingUsers?.length || 0,
		mappingRequests: data.pendingRequests?.length || 0
	};

	const accountDistribution = [
		{ name: 'Mapped', value: 45, percentage: 52.9, color: 'hsl(173, 80%, 40%)' },
		{ name: 'Unmapped', value: 28, percentage: 32.9, color: 'hsl(199, 89%, 48%)' },
		{ name: 'Parked', value: 12, percentage: 14.1, color: 'hsl(43, 96%, 56%)' }
	];

	const pendingUsers = data.pendingUsers || [];
	const pendingRequests = data.pendingRequests || [];

	const chartData = accountDistribution.map((item) => ({
		name: item.name,
		value: item.value,
		color: item.color
	}));

	const total = accountDistribution.reduce((sum, item) => sum + item.value, 0);

	const chartConfig = {
		value: { label: 'Accounts' },
		Mapped: { label: 'Mapped', color: 'hsl(173, 80%, 40%)' },
		Unmapped: { label: 'Unmapped', color: 'hsl(199, 89%, 48%)' },
		Parked: { label: 'Parked', color: 'hsl(43, 96%, 56%)' }
	} satisfies Chart.ChartConfig;
</script>

<div class="p-4 md:p-6 lg:p-8">
	<!-- Page Header -->
	<div class="mb-6">
		<h1 class="text-3xl font-bold text-foreground">Dashboard</h1>
		<p class="text-sm text-muted-foreground">Overview of bank accounts and pending requests</p>
	</div>

	<!-- Metric Cards -->
	<div class="mb-4 grid gap-4 md:grid-cols-3">
		<Card.Root class="py-2">
			<Card.Content class="flex items-center justify-between p-4">
				<div class="flex-1">
					<p class="mb-1 text-sm font-medium text-muted-foreground">TOTAL ACCOUNTS</p>
					<p class="text-3xl font-bold text-foreground">{metrics.totalAccounts}</p>
				</div>
				<div class="ml-4 rounded-lg bg-cyan-500/25 p-3">
					<WalletIcon class="size-6 text-cyan-300" />
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root class="py-2">
			<Card.Content class="flex items-center justify-between p-4">
				<div class="flex-1">
					<p class="mb-1 text-sm font-medium text-muted-foreground">PENDING USERS</p>
					<p class="text-3xl font-bold text-foreground">{metrics.pendingUsers}</p>
				</div>
				<div class="ml-4 rounded-lg bg-yellow-500/25 p-3">
					<UsersIcon class="size-6 text-yellow-300" />
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root class="py-2">
			<Card.Content class="flex items-center justify-between p-4">
				<div class="flex-1">
					<p class="mb-1 text-sm font-medium text-muted-foreground">MAPPING REQUESTS</p>
					<p class="text-3xl font-bold text-foreground">{metrics.mappingRequests}</p>
				</div>
				<div class="ml-4 rounded-lg bg-green-500/25 p-3">
					<ArrowUpRightIcon class="size-6 text-green-300" />
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Bank Account Distribution -->
	<Card.Root class="mb-6">
		<Card.Header>
			<Card.Title>Bank Account Distribution</Card.Title>
			<Card.Description>Overview of account mapping status</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="flex flex-col items-center gap-10 md:flex-row md:items-start">
				<!-- Donut Chart -->
				<div class="relative flex size-72 items-center justify-center">
					<Chart.Container config={chartConfig} class="mx-auto aspect-square h-96 w-96 max-h-[250px]">
						<PieChart
							data={chartData}
							key="name"
							value="value"
							c="color"
							innerRadius={75}
							padding={20}
							props={{ pie: { motion: 'tween' } }}
							>{#snippet tooltip()}
								<Chart.Tooltip hideLabel />
							{/snippet}
						</PieChart>
					</Chart.Container>
					<!-- Center text overlay -->
					<div class="pointer-events-none absolute inset-0 flex items-center justify-center">
						<div class="text-center">
							<p class="text-2xl font-bold text-foreground">{total}</p>
							<p class="text-xs font-medium text-muted-foreground">Total</p>
						</div>
					</div>
				</div>
				<!-- Legend -->
				<div class="flex-1 space-y-3 w-full">
					{#each accountDistribution as item}
						<div
							class="flex items-center justify-between rounded-lg border border-border bg-background p-4"
						>
							<div class="flex items-center gap-3">
								<div class="size-4 rounded" style="background-color: {item.color}"></div>
								<span class="text-sm font-medium text-foreground">{item.name}</span>
							</div>
							<div class="rounded-md px-3 py-1.5 text-right">
								<p class="text-lg font-semibold text-foreground">{item.value}</p>
								<p class="text-xs text-muted-foreground">{item.percentage}%</p>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Two Column Layout for Bottom Sections -->
	<div class="grid gap-6 md:grid-cols-2">
		<!-- Pending User Approvals -->
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<div>
					<Card.Title>Pending User Approvals</Card.Title>
					<Card.Description>New registrations awaiting approval</Card.Description>
				</div>
				<Button variant="ghost" size="icon" href="/management/users">
					<ArrowUpRightIcon class="size-4" />
				</Button>
			</Card.Header>
			<Card.Content>
				{#if pendingUsers.length > 0}
					<div class="max-h-[250px] space-y-0 overflow-y-auto">
						{#each pendingUsers as user}
							<button
								type="button"
								class="flex w-full items-center justify-between border-b border-border px-4 py-4 last:border-0 bg-background hover:bg-accent/50 transition-colors cursor-pointer text-left"
								onclick={() => openUserDialog(user)}
							>
								<div class="flex-1 min-w-0">
									<p class="font-medium text-foreground">{user.fullName}</p>
									<p class="text-sm text-muted-foreground">{user.email}</p>
								</div>
								<div class="ml-4 shrink-0 flex flex-col items-end">
									<div class="mb-2 flex items-center gap-2">
										<ClockIcon class="size-3 text-muted-foreground" />
										<span class="text-xs text-muted-foreground">{user.timeAgo}</span>
									</div>
									<span class="rounded-md px-2.5 py-1 text-xs font-medium {getUserTypeColor(user.type)}">
										{formatUserType(user.type)}
									</span>
								</div>
							</button>
						{/each}
					</div>
				{:else}
					<Empty.Root>
						<Empty.Header>
							<Empty.Media>
								<UserCheckIcon class="size-8 text-muted-foreground" />
							</Empty.Media>
							<Empty.Title>No pending approvals</Empty.Title>
							<Empty.Description>
								All user registrations have been processed. New registrations will appear here.
							</Empty.Description>
						</Empty.Header>
					</Empty.Root>
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- Account Mapping Requests -->
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<div>
					<Card.Title>Account Mapping Requests</Card.Title>
					<Card.Description>Merchant requests to map bank accounts</Card.Description>
				</div>
				<Button variant="ghost" size="icon" href="/management/requests">
					<ArrowUpRightIcon class="size-4" />
				</Button>
			</Card.Header>
			<Card.Content>
				{#if pendingRequests.length === 0}
					<div class="flex flex-col items-center justify-center py-8">
						<Empty.Root>
							<Empty.Header>
								<Empty.Media>
									<ArrowUpRightIcon class="size-8 text-muted-foreground" />
								</Empty.Media>
								<Empty.Title>No pending requests</Empty.Title>
								<Empty.Description>
									There are no merchant requests waiting for approval.
								</Empty.Description>
							</Empty.Header>
						</Empty.Root>
					</div>
				{:else}
					<div class="max-h-[250px] space-y-0 overflow-y-auto">
						{#each pendingRequests as request}
							<button
								type="button"
								class="flex w-full items-center justify-between border-b border-border px-4 py-4 text-left last:border-0 bg-background hover:bg-accent/50 transition-colors cursor-pointer"
								onclick={() => openRequestDialog(request)}
							>
								<div class="flex-1 min-w-0">
									<p class="font-medium text-foreground">{request.merchantName}</p>
									<div class="mt-1 flex items-center gap-2">
										<ClockIcon class="size-3 text-muted-foreground" />
										<span class="text-xs text-muted-foreground">{request.time}</span>
									</div>
								</div>
								<div class="ml-4 shrink-0">
									<span
										class="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
									>
										{request.accountNumber}
									</span>
								</div>
							</button>
						{/each}
					</div>
				{/if}
			</Card.Content>
		</Card.Root>
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

						<div>
							<div class="text-sm font-medium text-muted-foreground">Joined Date</div>
							<div class="mt-1 text-sm text-foreground">{formatDate(selectedUser.createdAt)}</div>
						</div>
					</div>

					<div class="border-t pt-4">
						<h4 class="mb-3 text-sm font-semibold">Actions</h4>

						<!-- Status Selection -->
						<div class="mb-3">
							<div class="text-sm font-medium text-muted-foreground">Status</div>
							<div class="mt-2 flex gap-2">
								{#each statusOptions as option}
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
								{#each typeOptions as option}
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

	<!-- Request Details Dialog -->
	<Dialog.Root bind:open={requestDialogOpen}>
		<Dialog.Content class="max-w-md">
			<Dialog.Header>
				<Dialog.Title>Request Details</Dialog.Title>
				<Dialog.Description>Review and approve merchant request</Dialog.Description>
			</Dialog.Header>

			{#if selectedRequest}
				<div class="space-y-4 py-4">
					<!-- Merchant Info -->
					<div>
						<h4 class="mb-2 text-sm font-medium text-muted-foreground">Merchant</h4>
						<div class="rounded-lg border border-border bg-muted/30 p-3">
							<div class="mb-2 flex items-center gap-2">
								<UserIcon class="size-4 text-muted-foreground" />
								<span class="font-medium">{selectedRequest.merchantName}</span>
							</div>
							<div class="flex items-center gap-2">
								<MailIcon class="size-4 text-muted-foreground" />
								<span class="text-sm text-muted-foreground">{selectedRequest.merchantEmail}</span>
							</div>
						</div>
					</div>

					<!-- Bank Account Info -->
					<div>
						<h4 class="mb-2 text-sm font-medium text-muted-foreground">Bank Account</h4>
						<div class="rounded-lg border border-border bg-muted/30 p-3">
							<div class="mb-2 flex items-center gap-2">
								<BuildingIcon class="size-4 text-muted-foreground" />
								<span class="font-medium">{selectedRequest.bankName}</span>
							</div>
							<div class="space-y-1">
								<div class="flex justify-between text-sm">
									<span class="text-muted-foreground">Account Number</span>
									<span class="font-mono">{selectedRequest.accountNumber}</span>
								</div>
								<div class="flex justify-between text-sm">
									<span class="text-muted-foreground">IFSC Code</span>
									<span class="font-mono">{selectedRequest.ifscCode}</span>
								</div>
								<div class="flex justify-between text-sm">
									<span class="text-muted-foreground">Holder Name</span>
									<span>{selectedRequest.accountHolderName}</span>
								</div>
							</div>
						</div>
					</div>

					<!-- Request Notes -->
					<div>
						<h4 class="mb-2 text-sm font-medium text-muted-foreground">Request Notes</h4>
						<div class="rounded-lg border border-border bg-muted/30 p-3">
							<p class="text-sm">{selectedRequest.requestNotes || 'No notes provided'}</p>
						</div>
					</div>

					<!-- Timeline -->
					<div>
						<h4 class="mb-2 text-sm font-medium text-muted-foreground">Timeline</h4>
						<div class="flex items-center gap-2 text-sm">
							<ClockIcon class="size-4 text-muted-foreground" />
							<span class="text-muted-foreground">Requested {selectedRequest.time}</span>
						</div>
					</div>
				</div>

				<Dialog.Footer>
					<div class="flex w-full gap-2">
						<Button
							class="flex-1 bg-teal-600 text-white hover:bg-teal-700"
							onclick={handleApproveRequest}
							disabled={isProcessingRequest}
						>
							{#if isProcessingRequest}
								<Spinner class="mr-2 size-4" />
								Approving...
							{:else}
								<CheckCircleIcon class="mr-2 size-4" />
								Approve
							{/if}
						</Button>
						<Button
							variant="secondary"
							class="flex-1"
							onclick={handleRejectRequest}
							disabled={isProcessingRequest}
						>
							{#if isProcessingRequest}
								<Spinner class="mr-2 size-4" />
								Rejecting...
							{:else}
								<XCircleIcon class="mr-2 size-4" />
								Reject
							{/if}
						</Button>
					</div>
				</Dialog.Footer>
			{/if}
		</Dialog.Content>
	</Dialog.Root>
</div>
