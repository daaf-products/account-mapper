<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import * as Empty from '$lib/components/ui/empty';
	import WalletIcon from '@lucide/svelte/icons/wallet';
	import UsersIcon from '@lucide/svelte/icons/users';
	import ArrowUpRightIcon from '@lucide/svelte/icons/arrow-up-right';
	import * as Chart from '$lib/components/ui/chart/index.js';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import UserCheckIcon from '@lucide/svelte/icons/user-check';
	import type { PageData } from './$types';
	import { PieChart } from 'layerchart';

	let { data }: { data: PageData } = $props();

	// Mock data - will be replaced with real data later
	const metrics = {
		totalAccounts: 85,
		pendingUsers: data.pendingUsers?.length || 0,
		mappingRequests: 3
	};

	const accountDistribution = [
		{ name: 'Mapped', value: 45, percentage: 52.9, color: 'hsl(173, 80%, 40%)' },
		{ name: 'Unmapped', value: 28, percentage: 32.9, color: 'hsl(199, 89%, 48%)' },
		{ name: 'Parked', value: 12, percentage: 14.1, color: 'hsl(43, 96%, 56%)' }
	];

	const pendingUsers = data.pendingUsers || [];

	// Debug: Log to see what we're getting
	$effect(() => {
		console.log('Pending users from data:', data.pendingUsers);
		console.log('Pending users array:', pendingUsers);
		console.log('Pending users length:', pendingUsers.length);
	});

	const mappingRequests = [
		{ company: 'Tech Solutions Ltd', time: '1 hour ago', account: '****4521' },
		{ company: 'Global Traders Inc', time: '3 hours ago', account: '****7832' },
		{ company: 'Digital Services Co', time: '5 hours ago', account: '****9201' },
		{ company: 'Innovation Hub LLC', time: '6 hours ago', account: '****3456' },
		{ company: 'Prime Commerce Group', time: '8 hours ago', account: '****7890' },
		{ company: 'Elite Business Solutions', time: '12 hours ago', account: '****2345' },
		{ company: 'Advanced Systems Corp', time: '1 day ago', account: '****6789' },
		{ company: 'Strategic Partners Inc', time: '1 day ago', account: '****0123' },
		{ company: 'Modern Enterprises Ltd', time: '2 days ago', account: '****4567' },
		{ company: 'Dynamic Ventures LLC', time: '2 days ago', account: '****8901' },
		{ company: 'Premium Services Group', time: '3 days ago', account: '****2345' },
		{ company: 'Global Finance Corp', time: '3 days ago', account: '****6789' },
		{ company: 'Tech Innovations Ltd', time: '4 days ago', account: '****0123' },
		{ company: 'Business Excellence Inc', time: '4 days ago', account: '****4567' }
	];

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
							<div
								class="flex items-center justify-between border-b border-border px-4 py-4 last:border-0 bg-background"
							>
								<div class="flex-1 min-w-0">
									<p class="font-medium text-foreground">{user.name}</p>
									<p class="text-sm text-muted-foreground">{user.email}</p>
									<div class="mt-1 flex items-center gap-2">
										<ClockIcon class="size-3 text-muted-foreground" />
										<span class="text-xs text-muted-foreground">{user.time}</span>
									</div>
								</div>
								<div class="ml-4 shrink-0">
									<span
										class="rounded-md bg-amber-500/20 px-2.5 py-1 text-xs font-medium text-amber-400"
									>
										Unassigned
									</span>
								</div>
							</div>
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
				<Button variant="ghost" size="icon" href="/management/accounts">
					<ArrowUpRightIcon class="size-4" />
				</Button>
			</Card.Header>
			<Card.Content>
				<div class="max-h-[250px] space-y-0 overflow-y-auto">
					{#each mappingRequests as request}
						<div
							class="flex items-center justify-between border-b border-border px-4 py-4 last:border-0 bg-background"
						>
							<div class="flex-1 min-w-0">
								<p class="font-medium text-foreground">{request.company}</p>
								<div class="mt-1 flex items-center gap-2">
									<ClockIcon class="size-3 text-muted-foreground" />
									<span class="text-xs text-muted-foreground">{request.time}</span>
								</div>
							</div>
							<div class="ml-4 shrink-0">
								<span
									class="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
								>
									{request.account}
								</span>
							</div>
						</div>
					{/each}
				</div>
			</Card.Content>
		</Card.Root>
	</div>
</div>
