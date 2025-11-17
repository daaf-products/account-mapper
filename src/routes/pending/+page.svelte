<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import type { PageData } from './$types';
	import LogOutIcon from '@lucide/svelte/icons/log-out';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import MailIcon from '@lucide/svelte/icons/mail';
	import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';

	let { data }: { data: PageData } = $props();
	let isLoading = $state(false);
</script>

<div class="min-h-screen p-4 md:p-6 lg:p-8">
	<!-- Header -->
	<header class="mb-6 flex items-center justify-between md:mb-8">
		<div class="flex items-center gap-2">
			<img src="/logo.svg" alt="Account Mapper" class="size-8 md:size-10" />
			<h1 class="text-xl font-bold md:text-2xl">Account Mapper</h1>
		</div>
		<div class="flex items-center gap-2 md:gap-4">
			<div class="hidden text-right md:block">
				<p class="text-sm font-medium">{data.user.full_name}</p>
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
				<Button
					type="submit"
					variant="outline"
					size="sm"
					disabled={isLoading}
					class="hidden md:flex"
				>
					<LogOutIcon class="mr-2 size-4" />
					{isLoading ? 'Logging out...' : 'Logout'}
				</Button>
			</form>
		</div>
	</header>

	<!-- Mobile User Info -->
	<div class="mb-6 rounded-lg border border-border bg-card p-4 md:hidden">
		<div class="flex items-center justify-between">
			<div>
				<p class="font-medium">{data.user.full_name}</p>
				<p class="text-sm text-muted-foreground">{data.user.email}</p>
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
				<Button type="submit" variant="outline" size="sm" disabled={isLoading}>
					<LogOutIcon class="mr-2 size-4" />
					{isLoading ? 'Logging out...' : 'Logout'}
				</Button>
			</form>
		</div>
	</div>

	<!-- Main Content -->
	<div class="mx-auto max-w-2xl">
		<div class="flex flex-col items-center text-center">
			<!-- Status Icon -->
			<div
				class="mb-4 flex size-16 items-center justify-center rounded-full bg-yellow-500/10 md:mb-6 md:size-20"
			>
				<ClockIcon class="size-8 text-yellow-500 md:size-10" />
			</div>

			<!-- Title -->
			<h2 class="mb-2 text-2xl font-bold">Account Pending Approval</h2>
			<p class="mb-6 text-sm text-muted-foreground">
				Your account has been created successfully and is currently under review.
			</p>

			<!-- Information Box -->
			<div class="mb-6 w-full rounded-lg border border-border bg-card p-4 text-left">
				<p class="text-sm text-muted-foreground">
					Our management team needs to approve your account before you can gain access to the
					platform. You will receive an email notification once your account has been approved.
				</p>
			</div>

			<!-- What's Next Section -->
			<div class="mb-4 flex w-full items-start gap-3 rounded-lg border border-border bg-card p-4">
				<div class="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
					<MailIcon class="size-4 text-primary" />
				</div>
				<div class="flex-1 text-left">
					<h3 class="mb-1 text-sm font-semibold">What's Next?</h3>
					<p class="text-sm text-muted-foreground">
						We'll send you an email at <span class="font-medium text-foreground"
							>{data.user.email}</span
						> when your account is approved.
					</p>
				</div>
			</div>

			<!-- Approval Timeline Section -->
			<div class="mb-6 flex w-full items-start gap-3 rounded-lg border border-border bg-card p-4">
				<div class="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
					<ShieldCheckIcon class="size-4 text-primary" />
				</div>
				<div class="flex-1 text-left">
					<h3 class="mb-1 text-sm font-semibold">Approval Timeline</h3>
					<p class="text-sm text-muted-foreground">
						Account reviews typically take 24-48 hours during business days.
					</p>
				</div>
			</div>
		</div>
	</div>
</div>
