<script lang="ts">
	import { page } from '$app/stores';
	import { goto, invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import type { PageData } from './$types';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import * as Table from '$lib/components/ui/table';
	import SearchIcon from '@lucide/svelte/icons/search';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import CheckCircleIcon from '@lucide/svelte/icons/check-circle';
	import XCircleIcon from '@lucide/svelte/icons/x-circle';
	import BuildingIcon from '@lucide/svelte/icons/building';
	import UserIcon from '@lucide/svelte/icons/user';
	import MailIcon from '@lucide/svelte/icons/mail';

	let { data }: { data: PageData } = $props();

	// State
	let searchQuery = $state(data.filters.search);
	let statusFilter = $state(data.filters.status);
	let isLoading = $state(false);
	let currentPage = $state(1);
	let pageSize = $state(10);

	// Mobile infinite scroll
	let mobileItemsToShow = $state(10);
	let loadMoreSentinel = $state<HTMLDivElement | undefined>();

	// Selected request for preview (right sidebar)
	let selectedRequest = $state<(typeof data.requests)[0] | null>(null);
	let isProcessing = $state(false);

	// Filter tabs - make reactive to data changes
	let tabs = $derived([
		{ value: 'pending', label: 'Pending', count: data.stats.pending, icon: ClockIcon },
		{ value: 'approved', label: 'Approved', count: data.stats.approved, icon: CheckCircleIcon },
		{ value: 'rejected', label: 'Rejected', count: data.stats.rejected, icon: XCircleIcon }
	]);

	// Filtered and paginated data
	let filteredRequests = $derived(
		data.requests.filter((request) => {
			const query = searchQuery.toLowerCase();
			if (!query) return true;
			return (
				request.merchantName.toLowerCase().includes(query) ||
				request.merchantEmail.toLowerCase().includes(query) ||
				request.bankName.toLowerCase().includes(query) ||
				request.accountNumber.toLowerCase().includes(query)
			);
		})
	);

	let totalPages = $derived(Math.ceil(filteredRequests.length / pageSize));
	let paginatedRequests = $derived(
		filteredRequests.slice((currentPage - 1) * pageSize, currentPage * pageSize)
	);

	let mobileRequests = $derived(filteredRequests.slice(0, mobileItemsToShow));

	// Helper functions
	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function getStatusColor(status: string) {
		switch (status) {
			case 'pending':
				return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
			case 'approved':
				return 'bg-green-500/10 text-green-500 border-green-500/20';
			case 'rejected':
				return 'bg-red-500/10 text-red-500 border-red-500/20';
			default:
				return 'bg-muted text-muted-foreground';
		}
	}

	function getStatusIcon(status: string) {
		switch (status) {
			case 'pending':
				return ClockIcon;
			case 'approved':
				return CheckCircleIcon;
			case 'rejected':
				return XCircleIcon;
			default:
				return ClockIcon;
		}
	}

	// Handle tab change
	async function handleTabChange(value: string) {
		statusFilter = value;
		isLoading = true;
		const url = new URL($page.url);
		url.searchParams.set('status', value);
		await goto(url.toString(), { keepFocus: true, noScroll: true });
		isLoading = false;
		currentPage = 1;
	}

	// Handle search
	function handleSearch() {
		currentPage = 1;
	}

	// Handle pagination
	function nextPage() {
		if (currentPage < totalPages) {
			currentPage++;
		}
	}

	function prevPage() {
		if (currentPage > 1) {
			currentPage--;
		}
	}

	// Select request for preview
	function selectRequest(request: (typeof data.requests)[0]) {
		selectedRequest = request;
	}

	// Handle approve/reject
	async function handleApprove(requestId: string) {
		isProcessing = true;
		try {
			const response = await fetch('/api/requests/update', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ requestId, status: 'approved' })
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to approve request');
			}

			toast.success('Request approved successfully');
			await invalidateAll();
			selectedRequest = null;
		} catch (error) {
			console.error('Error approving request:', error);
			toast.error(error instanceof Error ? error.message : 'Failed to approve request');
		} finally {
			isProcessing = false;
		}
	}

	async function handleReject(requestId: string) {
		isProcessing = true;
		try {
			const response = await fetch('/api/requests/update', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ requestId, status: 'rejected' })
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to reject request');
			}

			toast.success('Request rejected successfully');
			await invalidateAll();
			selectedRequest = null;
		} catch (error) {
			console.error('Error rejecting request:', error);
			toast.error(error instanceof Error ? error.message : 'Failed to reject request');
		} finally {
			isProcessing = false;
		}
	}

	// Mobile infinite scroll
	function loadMore() {
		if (mobileItemsToShow < filteredRequests.length) {
			mobileItemsToShow += 10;
		}
	}

	onMount(() => {
		// Set up intersection observer for infinite scroll
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting) {
					loadMore();
				}
			},
			{ threshold: 0.1 }
		);

		if (loadMoreSentinel) {
			observer.observe(loadMoreSentinel);
		}

		return () => {
			if (loadMoreSentinel) {
				observer.unobserve(loadMoreSentinel);
			}
		};
	});
</script>

<svelte:head>
	<title>Account Mapping Requests | Account Mapper</title>
</svelte:head>

<div class="flex h-full flex-col p-4 md:p-6">
	<!-- Header -->
	<div class="mb-6 flex flex-col gap-4 md:mb-8">
		<div>
			<h1 class="text-2xl font-semibold text-foreground">Account Mapping Requests</h1>
			<p class="text-sm text-muted-foreground md:text-base">
				Review and manage merchant requests to map bank accounts
			</p>
		</div>

		<!-- Stats Cards -->
		<div class="grid grid-cols-2 gap-4 md:grid-cols-4">
			<!-- Total Requests -->
			<Card.Root class="py-0">
				<Card.Content class="p-4 md:p-6">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-xs text-muted-foreground md:text-sm">Total</p>
							<p class="text-xl font-bold md:text-2xl">{data.stats.total}</p>
						</div>
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Pending -->
			<Card.Root class="py-0">
				<Card.Content class="p-4 md:p-6">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-xs text-muted-foreground md:text-sm">Pending</p>
							<p class="text-xl font-bold text-yellow-500 md:text-2xl">{data.stats.pending}</p>
						</div>
						<div class="flex size-10 items-center justify-center rounded-full bg-yellow-500/10">
							<ClockIcon class="size-5 text-yellow-500" />
						</div>
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Approved -->
			<Card.Root class="py-0">
				<Card.Content class="p-4 md:p-6">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-xs text-muted-foreground md:text-sm">Approved</p>
							<p class="text-xl font-bold text-green-500 md:text-2xl">{data.stats.approved}</p>
						</div>
						<div class="flex size-10 items-center justify-center rounded-full bg-green-500/10">
							<CheckCircleIcon class="size-5 text-green-500" />
						</div>
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Rejected -->
			<Card.Root class="py-0">
				<Card.Content class="p-4 md:p-6">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-xs text-muted-foreground md:text-sm">Rejected</p>
							<p class="text-xl font-bold text-red-500 md:text-2xl">{data.stats.rejected}</p>
						</div>
						<div class="flex size-10 items-center justify-center rounded-full bg-red-500/10">
							<XCircleIcon class="size-5 text-red-500" />
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		</div>
	</div>

	<!-- Main Content -->
	<div class="flex flex-1 gap-6 overflow-hidden">
		<!-- Requests List -->
		<div class="flex flex-1 flex-col overflow-hidden">
			<Card.Root class="flex flex-1 flex-col overflow-hidden">
				<Card.Header>
					<div class="flex flex-col gap-4">
						<!-- Tabs -->
						<div class="flex gap-2 border-b border-border">
							{#each tabs as tab}
								{@const Icon = tab.icon}
								<button
									type="button"
									onclick={() => handleTabChange(tab.value)}
									class="flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors {statusFilter ===
									tab.value
										? 'border-primary text-foreground'
										: 'border-transparent text-muted-foreground hover:text-foreground'}"
								>
									<Icon class="size-4" />
									{tab.label}
									<span
										class="rounded-full px-2 py-0.5 text-xs {statusFilter === tab.value
											? 'bg-primary/10 text-primary'
											: 'bg-muted text-muted-foreground'}"
									>
										{tab.count}
									</span>
								</button>
							{/each}
						</div>

						<!-- Search Bar -->
						<div class="relative">
							<SearchIcon
								class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
							/>
							<Input
								type="text"
								placeholder="Search by company name or account number..."
								bind:value={searchQuery}
								oninput={handleSearch}
								class="pl-10"
							/>
						</div>
					</div>
				</Card.Header>

				<Card.Content class="flex-1 overflow-auto p-0">
					{#if isLoading}
						<div class="flex items-center justify-center p-8">
							<div class="text-center">
								<div class="mb-2 inline-block size-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
								<p class="text-sm text-muted-foreground">Loading requests...</p>
							</div>
						</div>
					{:else if filteredRequests.length === 0}
						<div class="flex flex-col items-center justify-center p-8 text-center">
							<ClockIcon class="mb-4 size-12 text-muted-foreground/50" />
							<h3 class="mb-2 text-lg font-semibold">No {statusFilter} requests</h3>
							<p class="text-sm text-muted-foreground">
								{#if searchQuery}
									No requests match your search criteria.
								{:else}
									There are no {statusFilter} requests at the moment.
								{/if}
							</p>
						</div>
					{:else}
						<!-- Desktop Table View -->
						<div class="hidden md:block">
							<Table.Root>
								<Table.Header>
									<Table.Row>
										<Table.Head>Company</Table.Head>
										<Table.Head>Bank Details</Table.Head>
										<Table.Head>Account Holder</Table.Head>
										<Table.Head>Request Notes</Table.Head>
										<Table.Head>Requested</Table.Head>
										{#if statusFilter === 'pending'}
											<Table.Head class="text-right">Actions</Table.Head>
										{/if}
									</Table.Row>
								</Table.Header>
								<Table.Body>
									{#each paginatedRequests as request (request.id)}
										<Table.Row
											onclick={() => selectRequest(request)}
											class="cursor-pointer {selectedRequest?.id === request.id ? 'bg-accent/50' : ''}"
										>
											<Table.Cell>
												<div class="flex flex-col">
													<span class="font-medium">{request.merchantName}</span>
													<span class="text-sm text-muted-foreground">{request.merchantEmail}</span>
												</div>
											</Table.Cell>
											<Table.Cell>
												<div class="flex flex-col">
													<span class="font-medium">{request.bankName}</span>
													<span class="font-mono text-xs text-muted-foreground"
														>{request.accountNumber}</span
													>
												</div>
											</Table.Cell>
											<Table.Cell>
												<div class="flex flex-col">
													<span class="font-medium">{request.accountHolderName}</span>
													<span class="font-mono text-xs text-muted-foreground">{request.ifscCode}</span>
												</div>
											</Table.Cell>
											<Table.Cell>
												<span class="line-clamp-2 text-sm text-muted-foreground">
													{request.requestNotes || 'No notes provided'}
												</span>
											</Table.Cell>
											<Table.Cell>
												<span class="text-sm text-muted-foreground">
													{formatDate(request.createdAt)}
												</span>
											</Table.Cell>
											{#if statusFilter === 'pending'}
												<Table.Cell class="text-right">
													<div class="flex justify-end gap-2">
														<Button
															size="sm"
															class="h-8 bg-teal-600 text-white hover:bg-teal-700"
															onclick={(e: MouseEvent) => {
																e.stopPropagation();
																handleApprove(request.id);
															}}
															disabled={isProcessing}
															loading={isProcessing}
														>
															<CheckCircleIcon class="size-3" />
															Approve
														</Button>
														<Button
															size="sm"
															variant="secondary"
															class="h-8 bg-destructive"
															onclick={(e: MouseEvent) => {
																e.stopPropagation();
																handleReject(request.id);
															}}
															disabled={isProcessing}
															loading={isProcessing}
														>
															<XCircleIcon class="size-3" />
															Reject
														</Button>
													</div>
												</Table.Cell>
											{/if}
										</Table.Row>
									{/each}
								</Table.Body>
							</Table.Root>

							<!-- Pagination -->
							{#if totalPages > 1}
								<div
									class="flex items-center justify-between border-t border-border px-4 py-3"
								>
									<p class="text-sm text-muted-foreground">
										Showing {(currentPage - 1) * pageSize + 1} to {Math.min(
											currentPage * pageSize,
											filteredRequests.length
										)} of {filteredRequests.length} requests
									</p>
									<div class="flex items-center gap-2">
										<Button
											variant="outline"
											size="sm"
											onclick={prevPage}
											disabled={currentPage === 1}
										>
											Previous
										</Button>
										<span class="text-sm">
											Page {currentPage} of {totalPages}
										</span>
										<Button
											variant="outline"
											size="sm"
											onclick={nextPage}
											disabled={currentPage === totalPages}
										>
											Next
										</Button>
									</div>
								</div>
							{/if}
						</div>

						<!-- Mobile Card View -->
						<div class="flex flex-col gap-3 p-4 md:hidden">
							{#each mobileRequests as request (request.id)}
								{@const StatusIcon = getStatusIcon(request.status)}
								<div
									role="button"
									tabindex="0"
									class="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:bg-accent/50 cursor-pointer"
									onclick={() => selectRequest(request)}
									onkeydown={(e) => {
										if (e.key === 'Enter' || e.key === ' ') {
											e.preventDefault();
											selectRequest(request);
										}
									}}
								>
									<!-- Header -->
									<div class="flex items-start justify-between">
										<div class="flex-1">
											<h3 class="font-semibold">{request.merchantName}</h3>
											<p class="text-sm text-muted-foreground">{request.merchantEmail}</p>
										</div>
										<span class="rounded-md border px-2 py-1 text-xs font-medium {getStatusColor(request.status)}">
											<StatusIcon class="mr-1 inline size-3" />
											{request.status.charAt(0).toUpperCase() + request.status.slice(1)}
										</span>
									</div>

									<!-- Bank Details -->
									<div class="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3">
										<BuildingIcon class="mt-1 size-4 shrink-0 text-muted-foreground" />
										<div class="flex-1">
											<p class="text-sm font-medium">{request.bankName}</p>
											<p class="font-mono text-xs text-muted-foreground">{request.accountNumber}</p>
										</div>
									</div>

									<!-- Account Holder -->
									<div class="flex items-start gap-3">
										<UserIcon class="mt-1 size-4 shrink-0 text-muted-foreground" />
										<div class="flex-1">
											<p class="text-xs text-muted-foreground">Account Holder</p>
											<p class="text-sm font-medium">{request.accountHolderName}</p>
											<p class="font-mono text-xs text-muted-foreground">{request.ifscCode}</p>
										</div>
									</div>

									<!-- Request Notes -->
									{#if request.requestNotes}
										<div class="rounded-lg border border-border bg-muted/30 p-3">
											<p class="mb-1 text-xs font-medium text-muted-foreground">Request Notes</p>
											<p class="text-sm">{request.requestNotes}</p>
										</div>
									{/if}

									<!-- Footer -->
									<div class="flex items-center justify-between border-t border-border pt-3">
										<span class="text-xs text-muted-foreground">
											{formatDate(request.createdAt)}
										</span>
										{#if statusFilter === 'pending'}
											<div class="flex gap-2">
												<Button
													size="sm"
													class="h-7 bg-teal-600 text-xs text-white hover:bg-teal-700"
													onclick={(e: MouseEvent) => {
														e.stopPropagation();
														handleApprove(request.id);
													}}
													disabled={isProcessing}
													loading={isProcessing}
												>
													<CheckCircleIcon class="size-3" />
													Approve
												</Button>
												<Button
													size="sm"
													variant="secondary"
													class="h-7 text-xs"
													onclick={(e: MouseEvent) => {
														e.stopPropagation();
														handleReject(request.id);
													}}
													disabled={isProcessing}
													loading={isProcessing}
												>
													<XCircleIcon class="size-3" />
													Reject
												</Button>
											</div>
										{/if}
									</div>
								</div>
							{/each}

							<!-- Load More Sentinel -->
							{#if mobileItemsToShow < filteredRequests.length}
								<div bind:this={loadMoreSentinel} class="py-4 text-center">
									<div
										class="inline-block size-6 animate-spin rounded-full border-4 border-primary border-t-transparent"
									></div>
								</div>
							{/if}
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Right Sidebar - Request Preview (Desktop Only) -->
		{#if selectedRequest}
			<div class="hidden w-96 flex-col gap-4 lg:flex">
				<Card.Root>
					<Card.Header>
						<Card.Title>Request Details</Card.Title>
					</Card.Header>
					<Card.Content class="space-y-4">
						<!-- Status -->
						{@const StatusIcon = getStatusIcon(selectedRequest.status)}
						<div>
							<span class="rounded-md border px-3 py-1.5 text-sm font-medium {getStatusColor(selectedRequest.status)}">
								<StatusIcon class="mr-2 inline size-4" />
								{selectedRequest.status.charAt(0).toUpperCase() + selectedRequest.status.slice(1)}
							</span>
						</div>

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
							<div class="space-y-2 text-sm">
								<div class="flex justify-between">
									<span class="text-muted-foreground">Requested</span>
									<span>{formatDate(selectedRequest.createdAt)}</span>
								</div>
								{#if selectedRequest.reviewedAt}
									<div class="flex justify-between">
										<span class="text-muted-foreground">Reviewed</span>
										<span>{formatDate(selectedRequest.reviewedAt)}</span>
									</div>
								{/if}
								{#if selectedRequest.reviewedByName}
									<div class="flex justify-between">
										<span class="text-muted-foreground">Reviewed By</span>
										<span>{selectedRequest.reviewedByName}</span>
									</div>
								{/if}
							</div>
						</div>

						<!-- Actions -->
						{#if selectedRequest.status === 'pending'}
							<div class="flex gap-2 pt-4">
								<Button
									class="flex-1 bg-teal-600 text-white hover:bg-teal-700"
									onclick={() => handleApprove(selectedRequest!.id)}
									disabled={isProcessing}
									loading={isProcessing}
								>
									<CheckCircleIcon class="size-4" />
									Approve
								</Button>
								<Button
									variant="secondary"
									class="flex-1"
									onclick={() => handleReject(selectedRequest!.id)}
									disabled={isProcessing}
									loading={isProcessing}
								>
									<XCircleIcon class="size-4" />
									Reject
								</Button>
							</div>
						{/if}
					</Card.Content>
				</Card.Root>
			</div>
		{/if}
	</div>
</div>

