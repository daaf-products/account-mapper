<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import * as Empty from '$lib/components/ui/empty';
	import { Spinner } from '$lib/components/ui/spinner';
	import type { PageData } from './$types';
	import CheckCircleIcon from '@lucide/svelte/icons/check-circle';
	import XCircleIcon from '@lucide/svelte/icons/x-circle';
	import InfoIcon from '@lucide/svelte/icons/info';
	import BellIcon from '@lucide/svelte/icons/bell';
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';

	let { data }: { data: PageData } = $props();

	// Filter state
	let activeTab = $state(data.filters?.type || 'all');
	let isMarkingRead = $state<string | null>(null);
	let isMarkingAllRead = $state(false);

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

	// Handle tab change
	async function handleTabChange(tab: string) {
		activeTab = tab;
		// eslint-disable-next-line svelte/prefer-svelte-reactivity
		const params = new URLSearchParams();
		if (tab !== 'all') {
			params.set('type', tab);
		}
		await goto(params.toString() ? `?${params.toString()}` : window.location.pathname, {
			keepFocus: true,
			noScroll: true,
			replaceState: false
		});
		await invalidateAll();
	}

	// Mark notification as read
	async function markAsRead(notificationId: string, event?: Event) {
		if (event) {
			event.stopPropagation();
		}
		if (isMarkingRead) return;

		isMarkingRead = notificationId;
		try {
			const response = await fetch(`/api/notifications/${notificationId}/read`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				}
			});

			if (!response.ok) {
				throw new Error('Failed to mark notification as read');
			}

			await invalidateAll();
		} catch {
			toast.error('Failed to mark notification as read');
		} finally {
			isMarkingRead = null;
		}
	}

	// Mark all notifications as read
	async function markAllAsRead() {
		if (isMarkingAllRead) return;

		isMarkingAllRead = true;
		try {
			const response = await fetch('/api/notifications/read-all', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				}
			});

			if (!response.ok) {
				throw new Error('Failed to mark all notifications as read');
			}

			toast.success('All notifications marked as read');
			await invalidateAll();
		} catch {
			toast.error('Failed to mark all notifications as read');
		} finally {
			isMarkingAllRead = false;
		}
	}

	// Handle card click - mark as read if unread
	async function handleCardClick(notification: (typeof data.notifications)[0]) {
		if (!notification.readAt) {
			await markAsRead(notification.id);
		}
	}

	// Get notification icon based on type
	function getNotificationIcon(type: string) {
		switch (type) {
			case 'mapping_approved':
				return CheckCircleIcon;
			case 'mapping_rejected':
				return XCircleIcon;
			case 'profile_verified':
			case 'account_parked':
			case 'account_unmapped':
			case 'system':
			default:
				return InfoIcon;
		}
	}

	// Get notification icon color based on type
	function getNotificationIconColor(type: string) {
		switch (type) {
			case 'mapping_approved':
				return 'text-green-400';
			case 'mapping_rejected':
				return 'text-red-400';
			case 'profile_verified':
			case 'account_parked':
			case 'account_unmapped':
			case 'system':
			default:
				return 'text-blue-400';
		}
	}

	// Get notification icon background color based on type
	function getNotificationIconBg(type: string) {
		switch (type) {
			case 'mapping_approved':
				return 'bg-green-500/20';
			case 'mapping_rejected':
				return 'bg-red-500/20';
			case 'profile_verified':
			case 'account_parked':
			case 'account_unmapped':
			case 'system':
			default:
				return 'bg-blue-500/20';
		}
	}

	// Format date helper - returns relative time format
	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		const now = new Date();
		const diffInMs = now.getTime() - date.getTime();
		const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
		const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
		const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

		// Return relative time format
		if (diffInMinutes < 60) {
			return diffInMinutes <= 1 ? 'Just now' : `${diffInMinutes}m ago`;
		} else if (diffInHours < 24) {
			return `${diffInHours}h ago`;
		} else if (diffInDays < 30) {
			return `${diffInDays}d ago`;
		} else {
			const diffInMonths = Math.floor(diffInDays / 30);
			return `${diffInMonths}mo ago`;
		}
	}

	// Filter notifications based on active tab
	let filteredNotifications = $derived(() => {
		return data.notifications || [];
	});
</script>

<div class="p-4 md:p-6 lg:p-8">
	<!-- Page Header -->
	<div class="mb-6">
		<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
			<div>
				<h1 class="text-3xl font-bold text-foreground">Notifications</h1>
				{#if (data.stats?.unread || 0) > 0}
					<p class="text-sm text-muted-foreground">{data.stats?.unread || 0} unread</p>
				{/if}
			</div>
			<div class="flex items-center gap-3">
				{#if data.stats?.unread > 0}
					<Button variant="outline" size="sm" onclick={markAllAsRead} disabled={isMarkingAllRead}>
						{#if isMarkingAllRead}
							<Spinner class="mr-2 size-4" />
							Marking all...
						{:else}
							Mark all as read
						{/if}
					</Button>
				{/if}
				{#if isRefreshing}
					<div class="flex items-center gap-2 text-xs text-muted-foreground">
						<div class="size-2 animate-pulse rounded-full bg-primary"></div>
						<span>Refreshing...</span>
					</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- Summary Cards -->
	<div class="mb-6 flex flex-wrap gap-4">
		<Card.Root class="min-w-[calc(50%-0.5rem)] flex-1 py-2 sm:min-w-0">
			<Card.Content class="flex items-center justify-between p-4">
				<div class="flex-1">
					<p class="mb-1 text-sm font-medium text-muted-foreground">TOTAL</p>
					<p class="text-3xl font-bold text-foreground">{data.stats?.total || 0}</p>
				</div>
				<div class="ml-4 rounded-lg bg-cyan-500/25 p-3">
					<BellIcon class="size-6 text-cyan-300" />
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root class="min-w-[calc(50%-0.5rem)] flex-1 py-2 sm:min-w-0">
			<Card.Content class="flex items-center justify-between p-4">
				<div class="flex-1">
					<p class="mb-1 text-sm font-medium text-muted-foreground">UNREAD</p>
					<div class="flex items-center gap-2">
						<p class="text-3xl font-bold text-yellow-400">{data.stats?.unread || 0}</p>
						{#if (data.stats?.unread || 0) > 0}
							<div class="size-2 rounded-full bg-yellow-400"></div>
						{/if}
					</div>
				</div>
				<div class="ml-4 rounded-lg bg-yellow-500/25 p-3">
					<BellIcon class="size-6 text-yellow-300" />
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root class="min-w-[calc(50%-0.5rem)] flex-1 py-2 sm:min-w-0">
			<Card.Content class="flex items-center justify-between p-4">
				<div class="flex-1">
					<p class="mb-1 text-sm font-medium text-muted-foreground">APPROVED</p>
					<p class="text-3xl font-bold text-green-400">{data.stats?.approvals || 0}</p>
				</div>
				<div class="ml-4 rounded-lg bg-green-500/25 p-3">
					<CheckCircleIcon class="size-6 text-green-300" />
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root class="min-w-[calc(50%-0.5rem)] flex-1 py-2 sm:min-w-0">
			<Card.Content class="flex items-center justify-between p-4">
				<div class="flex-1">
					<p class="mb-1 text-sm font-medium text-muted-foreground">REJECTED</p>
					<p class="text-3xl font-bold text-red-400">{data.stats?.rejections || 0}</p>
				</div>
				<div class="ml-4 rounded-lg bg-red-500/25 p-3">
					<XCircleIcon class="size-6 text-red-300" />
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Filter Tabs -->
	<div class="mb-6 flex gap-2 overflow-x-auto border-b border-border pb-2">
		<button
			type="button"
			class="relative shrink-0 rounded-t-lg px-4 py-2 text-sm font-medium transition-colors {activeTab ===
			'all'
				? 'border-b-2 border-primary bg-primary/10 text-foreground'
				: 'text-muted-foreground hover:text-foreground'}"
			onclick={() => handleTabChange('all')}
		>
			All {data.stats?.total || 0}
		</button>
		<button
			type="button"
			class="relative shrink-0 rounded-t-lg px-4 py-2 text-sm font-medium transition-colors {activeTab ===
			'approvals'
				? 'border-b-2 border-primary bg-primary/10 text-foreground'
				: 'text-muted-foreground hover:text-foreground'}"
			onclick={() => handleTabChange('approvals')}
		>
			Approvals {data.stats?.approvals || 0}
		</button>
		<button
			type="button"
			class="relative shrink-0 rounded-t-lg px-4 py-2 text-sm font-medium transition-colors {activeTab ===
			'rejections'
				? 'border-b-2 border-primary bg-primary/10 text-foreground'
				: 'text-muted-foreground hover:text-foreground'}"
			onclick={() => handleTabChange('rejections')}
		>
			Rejections {data.stats?.rejections || 0}
		</button>
		<button
			type="button"
			class="relative shrink-0 rounded-t-lg px-4 py-2 text-sm font-medium transition-colors {activeTab ===
			'system'
				? 'border-b-2 border-primary bg-primary/10 text-foreground'
				: 'text-muted-foreground hover:text-foreground'}"
			onclick={() => handleTabChange('system')}
		>
			System {data.stats?.system || 0}
		</button>
	</div>

	<!-- Notifications List -->
	{#if filteredNotifications().length === 0}
		<Card.Root>
			<Card.Content class="py-12">
				<Empty.Root>
					<Empty.Header>
						<Empty.Media>
							<BellIcon class="size-8 text-muted-foreground" />
						</Empty.Media>
						<Empty.Title>No notifications</Empty.Title>
						<Empty.Description>
							{#if activeTab === 'approvals'}
								You don't have any approval notifications.
							{:else if activeTab === 'rejections'}
								You don't have any rejection notifications.
							{:else if activeTab === 'system'}
								You don't have any system notifications.
							{:else}
								You don't have any notifications yet.
							{/if}
						</Empty.Description>
					</Empty.Header>
				</Empty.Root>
			</Card.Content>
		</Card.Root>
	{:else}
		<div class="space-y-0 divide-y divide-border">
			{#each filteredNotifications() as notification (notification.id)}
				{@const Icon = getNotificationIcon(notification.type)}
				{@const iconColor = getNotificationIconColor(notification.type)}
				{@const iconBg = getNotificationIconBg(notification.type)}
				{@const dotColor =
					notification.type === 'mapping_approved'
						? 'bg-green-400'
						: notification.type === 'mapping_rejected'
							? 'bg-red-400'
							: 'bg-blue-400'}
				<div
					role="button"
					tabindex="0"
					class="cursor-pointer border-l-4 transition-colors hover:bg-accent/50 {!notification.readAt
						? 'border-l-primary bg-primary/5'
						: 'border-l-transparent'}"
					onclick={() => handleCardClick(notification)}
					onkeydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							handleCardClick(notification);
						}
					}}
				>
					<div class="flex items-start gap-4 p-4">
						<!-- Icon -->
						<div class="flex size-10 shrink-0 items-center justify-center rounded-full {iconBg}">
							<Icon class="size-5 {iconColor}" />
						</div>

						<!-- Content -->
						<div class="min-w-0 flex-1">
							<div class="flex items-start justify-between gap-4">
								<div class="min-w-0 flex-1">
									<div class="mb-1 flex items-center gap-2">
										<h3 class="font-semibold text-foreground">{notification.title}</h3>
										{#if !notification.readAt}
											<div class="size-2 shrink-0 rounded-full {dotColor}"></div>
										{/if}
									</div>
									<p class="text-sm text-muted-foreground">{notification.message}</p>
								</div>
								<div class="shrink-0 text-right">
									<p class="mb-1 text-xs text-muted-foreground">
										{formatDate(notification.createdAt)}
									</p>
									{#if !notification.readAt}
										<button
											type="button"
											class="text-xs text-primary hover:underline disabled:opacity-50"
											onclick={(e) => markAsRead(notification.id, e)}
											disabled={isMarkingRead === notification.id}
										>
											{#if isMarkingRead === notification.id}
												<Spinner class="mr-1 inline size-3" />
												Marking...
											{:else}
												Mark as read
											{/if}
										</button>
									{/if}
								</div>
							</div>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

