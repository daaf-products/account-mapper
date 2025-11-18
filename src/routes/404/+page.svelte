<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import FileQuestionIcon from '@lucide/svelte/icons/file-question';
	import AlertCircleIcon from '@lucide/svelte/icons/alert-circle';
	import HomeIcon from '@lucide/svelte/icons/home';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import { resolve } from '$app/paths';
</script>

<svelte:head>
	<title>404 - Page Not Found | Account Mapper</title>
	<meta name="description" content="The page you're looking for doesn't exist." />
</svelte:head>

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
				class="mb-4 flex size-16 items-center justify-center rounded-full bg-blue-500/10 md:mb-6 md:size-20"
			>
				<FileQuestionIcon class="size-8 text-blue-500 md:size-10" />
			</div>

			<!-- Error Code -->
			<div class="mb-2 text-6xl font-bold text-muted-foreground/20 md:text-8xl">404</div>

			<!-- Title -->
			<h2 class="mb-2 text-2xl font-bold">Page Not Found</h2>
			<p class="mb-6 text-sm text-muted-foreground">
				The page you're looking for doesn't exist or has been moved.
			</p>

			<!-- Alert Box -->
			<div
				class="mb-6 flex w-full items-start gap-3 rounded-lg border border-blue-500/50 bg-blue-500/10 p-4"
			>
				<AlertCircleIcon class="mt-0.5 size-4 shrink-0 text-blue-500" />
				<div class="flex-1 text-left">
					<p class="mb-1 text-sm font-semibold text-blue-500">Lost your way?</p>
					<p class="text-sm text-muted-foreground">
						The page you're trying to access doesn't exist. It may have been moved, deleted, or the
						URL might be incorrect.
					</p>
				</div>
			</div>

			<!-- Action Buttons -->
			<div class="flex w-full flex-col gap-4 sm:flex-row sm:justify-center">
				<Button onclick={() => window.history.back()} variant="outline" class="w-full sm:w-auto">
					<ArrowLeftIcon class="mr-2 size-4" />
					Go Back
				</Button>
				<Button href={resolve('/')} class="w-full sm:w-auto">
					<HomeIcon class="mr-2 size-4" />
					Go Home
				</Button>
			</div>

			<!-- Additional Help -->
			<div class="mt-8 text-center">
				<p class="mb-2 text-sm font-medium text-muted-foreground">Common pages:</p>
				<div class="flex flex-wrap justify-center gap-2 text-sm">
					<a href={resolve('/login')} class="text-primary hover:underline">Login</a>
					<span class="text-muted-foreground">•</span>
					<a href={resolve('/register')} class="text-primary hover:underline">Register</a>
					<span class="text-muted-foreground">•</span>
					<a href={resolve('/forgot-password')} class="text-primary hover:underline"
						>Forgot Password</a
					>
				</div>
			</div>
		</div>
	</div>
</div>

