<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import LockIcon from '@lucide/svelte/icons/lock';
	import AlertTriangleIcon from '@lucide/svelte/icons/alert-triangle';
	import { resolve } from '$app/paths';
</script>

<div class="min-h-screen p-4 md:p-6 lg:p-8">
	<!-- Header -->
	<header class="mb-6 flex items-center justify-between md:mb-8">
		<div class="flex items-center gap-2">
			<img src="/logo.svg" alt="Account Mapper" class="size-8 md:size-10" />
			<h1 class="text-xl font-bold md:text-2xl">Account Mapper</h1>
		</div>
	</header>

	<!-- Main Content -->
	<div class="mx-auto max-w-2xl">
		<div class="flex flex-col items-center text-center">
			<!-- Status Icon -->
			<div
				class="mb-4 flex size-16 items-center justify-center rounded-full bg-orange-500/10 md:mb-6 md:size-20"
			>
				<LockIcon class="size-8 text-orange-500 md:size-10" />
			</div>

			<!-- Title -->
			<h2 class="mb-2 text-2xl font-bold">Unauthorized Access</h2>
			<p class="mb-6 text-sm text-muted-foreground">
				You don't have permission to access this page. Please sign in to continue.
			</p>

			<!-- Alert Box -->
			<div
				class="mb-6 flex w-full items-start gap-3 rounded-lg border border-orange-500/50 bg-orange-500/10 p-4"
			>
				<AlertTriangleIcon class="mt-0.5 size-4 shrink-0 text-orange-500" />
				<div class="flex-1 text-left">
					<p class="mb-1 text-sm font-semibold text-orange-500">Access Denied</p>
					<p class="text-sm text-muted-foreground">
						This page requires authentication. Please sign in with your account to access this
						content.
					</p>
				</div>
			</div>

			<!-- Action Buttons -->
			<div class="flex w-full flex-col gap-4 sm:flex-row sm:justify-center">
				<Button href={resolve('/login')} class="w-full sm:w-auto">Sign In</Button>
				<Button href={resolve('/register')} variant="outline" class="w-full sm:w-auto">
					Create Account
				</Button>
			</div>
		</div>
	</div>
</div>
