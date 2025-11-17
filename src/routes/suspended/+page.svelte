<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import type { PageData } from './$types';
	import LogOutIcon from '@lucide/svelte/icons/log-out';
	import BanIcon from '@lucide/svelte/icons/ban';
	import AlertTriangleIcon from '@lucide/svelte/icons/alert-triangle';
	import MailIcon from '@lucide/svelte/icons/mail';
	import PhoneIcon from '@lucide/svelte/icons/phone';
	import CheckCircleIcon from '@lucide/svelte/icons/check-circle';

	let { data }: { data: PageData } = $props();
	let isLoading = $state(false);

	// Generate reference ID from user initials and random number
	const referenceId = `${data.user.initials}-${Math.floor(Math.random() * 1000000)}`;
</script>

<div class="p-4 md:p-6 lg:p-8">
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
				class="mb-4 flex size-16 items-center justify-center rounded-full bg-red-500/10 md:mb-6 md:size-20"
			>
				<BanIcon class="size-8 text-red-500 md:size-10" />
			</div>

			<!-- Title -->
			<h2 class="mb-2 text-2xl font-bold">Account Suspended</h2>
			<p class="mb-6 text-sm text-muted-foreground">
				Your account has been temporarily suspended and access is currently restricted.
			</p>

			<!-- Alert Box -->
			<div
				class="mb-6 flex w-full items-start gap-3 rounded-lg border border-destructive bg-destructive/10 p-4"
			>
				<AlertTriangleIcon class="mt-0.5 size-4 shrink-0 text-destructive" />
				<div class="flex-1 text-left">
					<p class="mb-1 text-sm font-semibold text-destructive">Access Restricted</p>
					<p class="text-sm text-muted-foreground">
						This account has been suspended due to multiple failed login attempts and potential
						security concerns.
					</p>
				</div>
			</div>

			<!-- Contact Management Team Section -->
			<div class="mb-6 w-full rounded-lg border border-border bg-card p-4">
				<h3 class="mb-4 text-left text-sm font-semibold">Contact Management Team</h3>

				<div class="space-y-3">
					<!-- Email Support -->
					<div class="flex items-start gap-3">
						<div
							class="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10"
						>
							<MailIcon class="size-4 text-primary" />
						</div>
						<div class="flex-1 text-left">
							<p class="mb-1 text-xs font-medium text-muted-foreground uppercase">Email Support</p>
							<a
								href="mailto:support@accountmapper.com"
								class="text-sm font-medium text-primary hover:underline"
							>
								support@accountmapper.com
							</a>
						</div>
					</div>

					<!-- Phone Support -->
					<div class="flex items-start gap-3">
						<div
							class="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10"
						>
							<PhoneIcon class="size-4 text-primary" />
						</div>
						<div class="flex-1 text-left">
							<p class="mb-1 text-xs font-medium text-muted-foreground uppercase">Phone Support</p>
							<p class="mb-1 text-sm font-medium">+1 (555) 123-4567</p>
							<p class="text-xs text-muted-foreground">Mon-Fri, 9AM-5PM EST</p>
						</div>
					</div>
				</div>
			</div>

			<!-- What You Can Do Section -->
			<div class="mb-6 w-full rounded-lg border border-border bg-card p-4">
				<h3 class="mb-3 text-left text-sm font-semibold">What You Can Do</h3>
				<ul class="space-y-2 text-left">
					<li class="flex items-start gap-2">
						<CheckCircleIcon class="mt-0.5 size-4 shrink-0 text-primary" />
						<span class="text-sm text-muted-foreground">
							Contact our management team using the information above
						</span>
					</li>
					<li class="flex items-start gap-2">
						<CheckCircleIcon class="mt-0.5 size-4 shrink-0 text-primary" />
						<span class="text-sm text-muted-foreground">
							Provide your account details and request a review
						</span>
					</li>
					<li class="flex items-start gap-2">
						<CheckCircleIcon class="mt-0.5 size-4 shrink-0 text-primary" />
						<span class="text-sm text-muted-foreground">
							Follow up within 3-5 business days if you don't hear back
						</span>
					</li>
				</ul>
			</div>

			<!-- Reference ID -->
			<div class="text-center">
				<p class="text-xs text-muted-foreground md:text-sm">Reference ID: {referenceId}</p>
			</div>
		</div>
	</div>
</div>
