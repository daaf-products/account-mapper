<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Drawer from '$lib/components/ui/drawer';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import type { LayoutData } from './$types';
	import MenuIcon from '@lucide/svelte/icons/menu';
	import LayoutDashboardIcon from '@lucide/svelte/icons/layout-dashboard';
	import WalletIcon from '@lucide/svelte/icons/wallet';
	import BuildingIcon from '@lucide/svelte/icons/building';
	import BellIcon from '@lucide/svelte/icons/bell';
	import LogOutIcon from '@lucide/svelte/icons/log-out';
	import { page } from '$app/stores';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	let drawerOpen = $state(false);
	let isLoading = $state(false);

	const navItems = [
		{ href: '/merchant', label: 'Dashboard', icon: LayoutDashboardIcon },
		{ href: '/merchant/accounts', label: 'Bank Accounts', icon: WalletIcon },
		{ href: '/merchant/mapped', label: 'Mapped Banks', icon: BuildingIcon },
		{ href: '/merchant/notifications', label: 'Notifications', icon: BellIcon }
	];

	// Close drawer when route changes
	// eslint-disable-next-line svelte/prefer-writable-derived
	$effect(() => {
		void $page.url.pathname; // Track route changes
		drawerOpen = false;
	});
</script>

<div class="flex h-screen w-full overflow-hidden">
	<!-- Desktop Sidebar -->
	<aside class="hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-card md:flex">
		<!-- Logo in Card -->
		<div class="shrink-0 p-4">
			<div class="rounded-lg border border-border bg-card p-3 shadow-sm">
				<div class="flex items-center gap-2">
					<img src="/logo.svg" alt="Account Mapper" class="size-8" />
					<div>
						<div class="font-semibold text-foreground">Merchant Portal</div>
						<div class="text-xs text-muted-foreground">Bank Account Management</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Navigation -->
		<nav class="relative flex-1 space-y-1 overflow-hidden px-4 py-2">
			{#each navItems as item (item.href)}
				{@const isActive = $page.url.pathname === item.href}
				{@const Icon = item.icon}
				<a
					href={item.href}
					class="relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors {isActive
						? 'bg-muted text-foreground'
						: 'text-muted-foreground hover:bg-muted hover:text-foreground'}"
				>
					{#if isActive}
						<div class="absolute left-0 h-8 w-1 rounded-r bg-primary"></div>
					{/if}
					<Icon class="size-5" />
					{item.label}
				</a>
			{/each}
		</nav>

		<!-- User Info & Logout -->
		<div class="shrink-0 border-t border-border p-4">
			<div class="mb-3">
				<p class="text-sm font-medium text-foreground">{data.user.full_name}</p>
				<p class="text-xs text-muted-foreground">{data.user.email}</p>
			</div>
			<form
				method="POST"
				action="/?/logout"
				use:enhance={() => {
					isLoading = true;
					return async ({ result, update }) => {
						isLoading = false;
						if (result.type === 'redirect') {
							toast.success('Logged out successfully');
						}
						await update();
					};
				}}
			>
				<Button type="submit" variant="outline" class="w-full" disabled={isLoading}>
					<LogOutIcon class="mr-2 size-4" />
					{isLoading ? 'Logging out...' : 'Logout'}
				</Button>
			</form>
		</div>
	</aside>

	<!-- Mobile Layout Container -->
	<div class="flex h-screen w-full flex-col md:hidden">
		<!-- Mobile Header -->
		<header
			class="sticky top-0 z-30 flex h-auto shrink-0 items-center justify-between border-b border-border bg-card px-4 py-3"
		>
			<div class="flex items-center gap-2">
				<div class="rounded-lg border border-border bg-card p-2 shadow-sm">
					<img src="/logo.svg" alt="Account Mapper" class="size-6" />
				</div>
				<span class="font-semibold">Merchant Portal</span>
			</div>
			<Button variant="ghost" size="icon" onclick={() => (drawerOpen = true)}>
				<MenuIcon class="size-5" />
			</Button>
		</header>

		<!-- Main Content -->
		<main class="min-h-0 flex-1 overflow-y-auto">
			{@render children()}
		</main>
	</div>

	<!-- Desktop Main Content -->
	<main class="hidden min-w-0 flex-1 overflow-y-auto md:block">
		{@render children()}
	</main>

	<!-- Mobile Drawer -->
	<Drawer.Root bind:open={drawerOpen} direction="right">
		<Drawer.Portal>
			<Drawer.Overlay />
			<Drawer.Content class="flex h-screen w-80 flex-col">
				<Drawer.Header class="shrink-0 px-4 pt-6">
					<div class="flex items-center gap-2">
						<div class="rounded-lg border border-border bg-card p-2 shadow-sm">
							<img src="/logo.svg" alt="Account Mapper" class="size-6" />
						</div>
						<div>
							<Drawer.Title class="text-lg">Merchant Portal</Drawer.Title>
						</div>
					</div>
				</Drawer.Header>

				<div class="flex min-h-0 flex-1 flex-col">
					<!-- Navigation -->
					<nav class="flex-1 space-y-1 overflow-hidden px-4 py-4">
						{#each navItems as item (item.href)}
							{@const isActive = $page.url.pathname === item.href}
							{@const Icon = item.icon}
							<a
								href={item.href}
								class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors {isActive
									? 'bg-muted text-foreground'
									: 'text-muted-foreground hover:bg-muted hover:text-foreground'}"
							>
								<Icon class="size-5" />
								{item.label}
							</a>
						{/each}
					</nav>

					<!-- User Info & Logout -->
					<div class="shrink-0 border-t border-border p-4">
						<div class="mb-4">
							<p class="text-sm font-medium text-foreground">{data.user.full_name}</p>
							<p class="mt-1 text-xs text-muted-foreground">{data.user.email}</p>
						</div>
						<form
							method="POST"
							action="/?/logout"
							use:enhance={() => {
								isLoading = true;
								return async ({ result, update }) => {
									isLoading = false;
									if (result.type === 'redirect') {
										toast.success('Logged out successfully');
									}
									await update();
								};
							}}
						>
							<Button type="submit" variant="outline" class="w-full" disabled={isLoading}>
								<LogOutIcon class="mr-2 size-4" />
								{isLoading ? 'Logging out...' : 'Logout'}
							</Button>
						</form>
					</div>
				</div>
			</Drawer.Content>
		</Drawer.Portal>
	</Drawer.Root>
</div>
