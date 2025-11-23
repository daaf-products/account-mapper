<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import * as Empty from '$lib/components/ui/empty';
	import * as Chart from '$lib/components/ui/chart/index.js';
	import CheckCircleIcon from '@lucide/svelte/icons/check-circle';
	import WalletIcon from '@lucide/svelte/icons/wallet';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import BuildingIcon from '@lucide/svelte/icons/building';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import DownloadIcon from '@lucide/svelte/icons/download';
	import BellIcon from '@lucide/svelte/icons/bell';
	import ArrowUpRightIcon from '@lucide/svelte/icons/arrow-up-right';
	import type { PageData } from './$types';
	import { PieChart } from 'layerchart';
	import { invalidateAll } from '$app/navigation';
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';

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
			name: 'Mapped',
			value: data.distribution?.mapped.count || 0,
			color: 'hsl(142, 76%, 36%)' // Green
		},
		{
			name: 'Available',
			value: data.distribution?.available.count || 0,
			color: 'hsl(173, 80%, 40%)' // Teal
		},
		{
			name: 'Pending',
			value: data.distribution?.pending.count || 0,
			color: 'hsl(43, 96%, 56%)' // Yellow/Orange
		}
	].filter((item) => item.value > 0);

	const total = data.distribution?.total || 0;

	const chartConfig = {
		value: { label: 'Accounts' },
		Mapped: { label: 'Mapped', color: 'hsl(142, 76%, 36%)' },
		Available: { label: 'Available', color: 'hsl(173, 80%, 40%)' },
		Pending: { label: 'Pending', color: 'hsl(43, 96%, 56%)' }
	} satisfies Chart.ChartConfig;

	// Distribution data for legend
	const distributionItems = [
		{
			name: 'Mapped',
			value: data.distribution?.mapped.count || 0,
			percentage: data.distribution?.mapped.percentage || 0,
			color: 'hsl(142, 76%, 36%)'
		},
		{
			name: 'Available',
			value: data.distribution?.available.count || 0,
			percentage: data.distribution?.available.percentage || 0,
			color: 'hsl(173, 80%, 40%)'
		},
		{
			name: 'Pending',
			value: data.distribution?.pending.count || 0,
			percentage: data.distribution?.pending.percentage || 0,
			color: 'hsl(43, 96%, 56%)'
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
					Overview of your bank accounts and mapping status
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
					<span class="text-lg font-semibold text-foreground">Profile Status Active</span>
				</div>
				<p class="mb-2 text-sm text-muted-foreground">
					Your account holder profile is verified and active.
				</p>
				<div class="flex items-center gap-4 text-xs text-muted-foreground">
					<span>Verified: {formatDate(data.profileStatus?.approvedAt)}</span>
					<span>KYC: {data.profileStatus?.kycStatus || 'Completed'}</span>
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
					<p class="mb-1 text-sm font-medium text-muted-foreground">MAPPED</p>
					<p class="text-3xl font-bold text-green-400">{data.accountOverview?.mapped || 0}</p>
				</div>
				<div class="ml-4 rounded-lg bg-green-500/25 p-3">
					<CheckCircleIcon class="size-6 text-green-300" />
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root class="py-2">
			<Card.Content class="flex items-center justify-between p-4">
				<div class="flex-1">
					<p class="mb-1 text-sm font-medium text-muted-foreground">AVAILABLE</p>
					<p class="text-3xl font-bold text-teal-400">{data.accountOverview?.available || 0}</p>
				</div>
				<div class="ml-4 rounded-lg bg-teal-500/25 p-3">
					<WalletIcon class="size-6 text-teal-300" />
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
	</div>

	<!-- Two Column Layout -->
	<div class="grid gap-6 md:grid-cols-2">
		<!-- Recent Accounts -->
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<div>
					<Card.Title>Recent Accounts</Card.Title>
					<Card.Description>Your recently added bank accounts</Card.Description>
				</div>
			</Card.Header>
			<Card.Content>
				{#if (data.recentAccounts?.length || 0) > 0}
					<div class="max-h-[250px] space-y-0 overflow-y-auto">
						{#each data.recentAccounts || [] as account (account.id)}
							<div
								class="flex w-full items-center justify-between border-b border-border px-4 py-4 last:border-0"
							>
								<div class="min-w-0 flex-1">
									<p class="font-medium text-foreground">{account.bankName}</p>
									<div class="mt-1 flex items-center gap-2">
										<span class="text-sm text-muted-foreground"
											>Account: {account.accountNumber}</span
										>
									</div>
									{#if account.mappedTo}
										<div class="mt-1 text-xs text-muted-foreground">To: {account.mappedTo}</div>
									{/if}
								</div>
								<div class="ml-4 shrink-0">
									<span
										class="rounded-md {account.status === 'mapped'
											? 'bg-green-500/20 text-green-400'
											: account.status === 'available'
												? 'bg-teal-500/20 text-teal-400'
												: 'bg-yellow-500/20 text-yellow-400'} px-2.5 py-1 text-xs font-medium"
									>
										{account.status === 'mapped'
											? 'Mapped'
											: account.status === 'available'
												? 'Available'
												: 'Pending'}
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
							<Empty.Title>No accounts yet</Empty.Title>
							<Empty.Description>
								You haven't added any bank accounts yet. Add your first account to get started.
							</Empty.Description>
						</Empty.Header>
					</Empty.Root>
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- Distribution Chart -->
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<div>
					<Card.Title>Distribution</Card.Title>
					<Card.Description>Account status breakdown</Card.Description>
				</div>
			</Card.Header>
			<Card.Content>
				{#if total > 0}
					<div class="flex flex-col gap-6 md:flex-row">
						<!-- Chart -->
						<div class="relative flex h-[200px] w-full items-center justify-center md:w-1/2">
							<Chart.Container config={chartConfig} class="h-full w-full">
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
										<div>
											<p class="text-sm font-medium text-foreground">{item.name}</p>
											<p class="text-xs text-muted-foreground">
												{item.value} account{item.value !== 1 ? 's' : ''}
											</p>
										</div>
									</div>
									<div class="text-right">
										<p class="text-sm font-semibold text-foreground">{item.percentage}%</p>
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
							<Empty.Title>No accounts</Empty.Title>
							<Empty.Description>
								Add your first bank account to see the distribution chart.
							</Empty.Description>
						</Empty.Header>
					</Empty.Root>
				{/if}
			</Card.Content>
		</Card.Root>
	</div>
</div>

