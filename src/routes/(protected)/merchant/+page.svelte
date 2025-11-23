<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import * as Empty from '$lib/components/ui/empty';
	import * as Chart from '$lib/components/ui/chart/index.js';
	import CheckCircleIcon from '@lucide/svelte/icons/check-circle';
	import WalletIcon from '@lucide/svelte/icons/wallet';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import BuildingIcon from '@lucide/svelte/icons/building';
	import ArrowUpRightIcon from '@lucide/svelte/icons/arrow-up-right';
	import type { PageData } from './$types';
	import { PieChart } from 'layerchart';
	import { invalidateAll } from '$app/navigation';
	import { onMount, onDestroy } from 'svelte';

	let { data }: { data: PageData } = $props();

	// Auto-refresh interval (30 seconds)
	let refreshInterval: ReturnType<typeof setInterval> | null = $state(null);
	let isRefreshing = $state(false);

	// Set up auto-refresh
	onMount(() => {
		refreshInterval = setInterval(async () => {
			isRefreshing = true;
			try {
				await invalidateAll();
			} catch (error) {
				console.error('Error refreshing data:', error);
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

	// Chart data for distribution
	const chartData = [
		{
			name: 'Active',
			value: data.distribution?.active.count || 0,
			color: 'hsl(173, 80%, 40%)' // Teal
		},
		{
			name: 'Pending',
			value: data.distribution?.pending.count || 0,
			color: 'hsl(43, 96%, 56%)' // Yellow
		},
		{
			name: 'Parked',
			value: data.distribution?.parked.count || 0,
			color: 'hsl(0, 0%, 50%)' // Grey
		}
	].filter((item) => item.value > 0); // Only show segments with values

	const total = data.distribution?.total || 0;

	const chartConfig = {
		value: { label: 'Accounts' },
		Active: { label: 'Active', color: 'hsl(173, 80%, 40%)' },
		Pending: { label: 'Pending', color: 'hsl(43, 96%, 56%)' },
		Parked: { label: 'Parked', color: 'hsl(0, 0%, 50%)' }
	} satisfies Chart.ChartConfig;

	// Distribution data for legend
	const distributionItems = [
		{
			name: 'Active',
			value: data.distribution?.active.count || 0,
			percentage: data.distribution?.active.percentage || 0,
			color: 'hsl(173, 80%, 40%)'
		},
		{
			name: 'Pending',
			value: data.distribution?.pending.count || 0,
			percentage: data.distribution?.pending.percentage || 0,
			color: 'hsl(43, 96%, 56%)'
		},
		{
			name: 'Parked',
			value: data.distribution?.parked.count || 0,
			percentage: data.distribution?.parked.percentage || 0,
			color: 'hsl(0, 0%, 50%)'
		}
	].filter((item) => item.value > 0);
</script>

<div class="p-4 md:p-6 lg:p-8">
	<!-- Page Header -->
	<div class="mb-6">
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-3xl font-bold text-foreground">Dashboard</h1>
				<p class="text-sm text-muted-foreground">
					Overview of your bank account mappings and requests
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

	<!-- Profile Status Card -->
	<Card.Root class="mb-6 border-green-500/50 bg-green-500/5">
		<Card.Content class="flex items-center gap-4 p-6">
			<div class="flex size-12 shrink-0 items-center justify-center rounded-full bg-green-500/20">
				<CheckCircleIcon class="size-6 text-green-400" />
			</div>
			<div class="flex-1">
				<div class="mb-1 flex items-center gap-2">
					<span class="text-lg font-semibold text-foreground">Approved</span>
				</div>
				<p class="mb-2 text-sm text-muted-foreground">
					Your merchant account is approved and active
				</p>
				<div class="flex items-center gap-4 text-xs text-muted-foreground">
					<span>Approved: {formatDate(data.profileStatus?.approvedAt)}</span>
					<span>By: {data.profileStatus?.approvedBy}</span>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Account Overview Cards -->
	<div class="mb-6 grid gap-4 md:grid-cols-4">
		<Card.Root class="py-2">
			<Card.Content class="flex items-center justify-between p-4">
				<div class="flex-1">
					<p class="mb-1 text-sm font-medium text-muted-foreground">TOTAL ACCOUNTS</p>
					<p class="text-3xl font-bold text-foreground">{data.accountOverview?.total || 0}</p>
				</div>
				<div class="ml-4 rounded-lg bg-cyan-500/25 p-3">
					<WalletIcon class="size-6 text-cyan-300" />
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root class="py-2">
			<Card.Content class="flex items-center justify-between p-4">
				<div class="flex-1">
					<p class="mb-1 text-sm font-medium text-muted-foreground">ACTIVE</p>
					<p class="text-3xl font-bold text-green-400">{data.accountOverview?.active || 0}</p>
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
					<p class="text-3xl font-bold text-yellow-400">{data.accountOverview?.pending || 0}</p>
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
					<p class="text-3xl font-bold text-muted-foreground">
						{data.accountOverview?.parked || 0}
					</p>
				</div>
				<div class="ml-4 rounded-lg bg-gray-500/25 p-3">
					<BuildingIcon class="size-6 text-gray-300" />
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Two Column Layout -->
	<div class="grid gap-6 md:grid-cols-2">
		<!-- Pending Requests -->
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<div>
					<Card.Title>Pending Requests</Card.Title>
					<Card.Description>Your mapping requests awaiting approval</Card.Description>
				</div>
				{#if (data.pendingRequests?.length || 0) > 0}
					<span
						class="rounded-full bg-yellow-500/20 px-2.5 py-1 text-xs font-medium text-yellow-400"
					>
						{data.pendingRequests?.length || 0} Awaiting
					</span>
				{/if}
			</Card.Header>
			<Card.Content>
				{#if (data.pendingRequests?.length || 0) > 0}
					<div class="max-h-[250px] space-y-0 overflow-y-auto">
						{#each data.pendingRequests || [] as request (request.id)}
							<div
								class="flex w-full items-center justify-between border-b border-border px-4 py-4 last:border-0"
							>
								<div class="min-w-0 flex-1">
									<p class="font-medium text-foreground">{request.bankName}</p>
									<div class="mt-1 flex items-center gap-2">
										<span class="text-sm text-muted-foreground"
											>Account: {request.accountNumber}</span
										>
									</div>
									<div class="mt-1 flex items-center gap-2">
										<ClockIcon class="size-3 text-muted-foreground" />
										<span class="text-xs text-muted-foreground">{request.time}</span>
									</div>
								</div>
								<div class="ml-4 shrink-0">
									<span
										class="rounded-md bg-yellow-500/20 px-2.5 py-1 text-xs font-medium text-yellow-400"
									>
										Pending
									</span>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<Empty.Root>
						<Empty.Header>
							<Empty.Media>
								<ClockIcon class="size-8 text-muted-foreground" />
							</Empty.Media>
							<Empty.Title>No pending requests</Empty.Title>
							<Empty.Description>
								You don't have any mapping requests waiting for approval.
							</Empty.Description>
						</Empty.Header>
					</Empty.Root>
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- Distribution Chart -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Distribution</Card.Title>
				<Card.Description>Account status overview</Card.Description>
			</Card.Header>
			<Card.Content>
				{#if total > 0}
					<div class="flex flex-col items-center gap-10 md:flex-row md:items-start">
						<!-- Donut Chart -->
						<div class="relative flex size-72 items-center justify-center">
							<Chart.Container
								config={chartConfig}
								class="mx-auto aspect-square h-96 max-h-[250px] w-96"
							>
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
						<div class="w-full flex-1 space-y-3">
							{#each distributionItems as item (item.name)}
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
				{:else}
					<Empty.Root>
						<Empty.Header>
							<Empty.Media>
								<WalletIcon class="size-8 text-muted-foreground" />
							</Empty.Media>
							<Empty.Title>No accounts yet</Empty.Title>
							<Empty.Description>
								You don't have any mapped accounts or pending requests.
							</Empty.Description>
						</Empty.Header>
					</Empty.Root>
				{/if}
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Currently Mapped Accounts -->
	<Card.Root class="mt-6">
		<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
			<div>
				<Card.Title>Currently Mapped Accounts</Card.Title>
				<Card.Description>Your active bank account mappings</Card.Description>
			</div>
			<Button variant="ghost" size="icon" href="/merchant/accounts">
				<ArrowUpRightIcon class="size-4" />
			</Button>
		</Card.Header>
		<Card.Content>
			{#if (data.mappedAccounts?.length || 0) > 0}
				<div class="space-y-0">
					{#each data.mappedAccounts || [] as account (account.id)}
						<div
							class="flex w-full items-center justify-between border-b border-border px-4 py-4 last:border-0"
						>
							<div class="min-w-0 flex-1">
								<p class="font-medium text-foreground">{account.bankName}</p>
								<div class="mt-1 flex items-center gap-2">
									<span class="text-sm text-muted-foreground">Account: {account.accountNumber}</span
									>
								</div>
								<div class="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
									<span>Mapped Since: {account.mappedSince}</span>
								</div>
							</div>
							<div class="ml-4 shrink-0">
								<span
									class="rounded-md bg-green-500/20 px-2.5 py-1 text-xs font-medium text-green-400"
								>
									Active
								</span>
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<Empty.Root>
					<Empty.Header>
						<Empty.Media>
							<WalletIcon class="size-8 text-muted-foreground" />
						</Empty.Media>
						<Empty.Title>No mapped accounts</Empty.Title>
						<Empty.Description>
							You don't have any bank accounts mapped yet. Submit a mapping request to get started.
						</Empty.Description>
					</Empty.Header>
				</Empty.Root>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
