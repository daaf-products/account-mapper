<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Spinner } from '$lib/components/ui/spinner';
	import * as Card from '$lib/components/ui/card';
	import EyeIcon from '@lucide/svelte/icons/eye';
	import EyeOffIcon from '@lucide/svelte/icons/eye-off';
	import KeyRoundIcon from '@lucide/svelte/icons/key-round';
	import { toast } from 'svelte-sonner';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import type { ActionData, PageData } from './$types';

	let { data }: { data: ActionData & PageData } = $props();

	let password = $state('');
	let confirmPassword = $state('');
	let showPassword = $state(false);
	let showConfirmPassword = $state(false);
	let isLoading = $state(false);
	let passwordError = $state('');
	let confirmPasswordError = $state('');

	// Handle server-side messages
	$effect(() => {
		if (data?.error) {
			toast.error('Reset failed', {
				description: data.error
			});
		}
	});

	function validatePasswords() {
		passwordError = '';
		confirmPasswordError = '';

		if (password.length > 0 && password.length < 8) {
			passwordError = 'Password must be at least 8 characters';
		}

		if (confirmPassword.length > 0 && password !== confirmPassword) {
			confirmPasswordError = 'Passwords do not match';
		}

		return !passwordError && !confirmPasswordError;
	}
</script>

<div class="flex min-h-screen items-center justify-center p-4">
	<Card.Root class="w-full max-w-md">
		<Card.Header class="space-y-1 text-center">
			<div class="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10">
				<KeyRoundIcon class="size-6 text-primary" />
			</div>
			<Card.Title class="text-2xl font-bold">Reset Password</Card.Title>
			<Card.Description>Enter your new password below</Card.Description>
		</Card.Header>

		<Card.Content>
			{#if !data?.hasSession}
				<!-- Invalid or expired token -->
				<div class="space-y-4 text-center">
					<div class="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-left">
						<p class="mb-1 text-sm font-semibold text-destructive">Link Invalid</p>
						<p class="text-sm text-muted-foreground">
							{data?.error ||
								'This reset link is invalid or has expired. Please request a new one.'}
						</p>
					</div>
					<Button href={resolve('/forgot-password')} class="w-full">Request New Link</Button>
					<p class="text-center text-sm text-muted-foreground">
						Remember your password?
						<a href={resolve('/login')} class="text-primary hover:underline">Sign in</a>
					</p>
				</div>
			{:else}
				<!-- Valid token - show reset form -->
				<form
					method="POST"
					action="?/resetPassword"
					use:enhance={() => {
						if (!validatePasswords()) {
							return ({ update }) => update({ reset: false });
						}
						isLoading = true;
						return async ({ result, update }) => {
							isLoading = false;
							if (result.type === 'redirect') {
								toast.success('Password reset successful!', {
									description: 'You can now sign in with your new password'
								});
							}
							await update();
						};
					}}
					class="space-y-4"
				>
					<div class="space-y-2">
						<Label for="password">New Password</Label>
						<div class="relative">
							<Input
								id="password"
								name="password"
								type={showPassword ? 'text' : 'password'}
								placeholder="Enter new password"
								bind:value={password}
								oninput={() => validatePasswords()}
								aria-invalid={passwordError ? 'true' : 'false'}
								class="pr-10"
								disabled={isLoading}
								required
							/>
							<button
								type="button"
								onclick={() => (showPassword = !showPassword)}
								class="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
								aria-label={showPassword ? 'Hide password' : 'Show password'}
								disabled={isLoading}
							>
								{#if showPassword}
									<EyeOffIcon class="size-4" />
								{:else}
									<EyeIcon class="size-4" />
								{/if}
							</button>
						</div>
						{#if passwordError}
							<p class="text-sm text-destructive">{passwordError}</p>
						{/if}
					</div>

					<div class="space-y-2">
						<Label for="confirmPassword">Confirm Password</Label>
						<div class="relative">
							<Input
								id="confirmPassword"
								name="confirmPassword"
								type={showConfirmPassword ? 'text' : 'password'}
								placeholder="Re-enter new password"
								bind:value={confirmPassword}
								oninput={() => validatePasswords()}
								aria-invalid={confirmPasswordError ? 'true' : 'false'}
								class="pr-10"
								disabled={isLoading}
								required
							/>
							<button
								type="button"
								onclick={() => (showConfirmPassword = !showConfirmPassword)}
								class="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
								aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
								disabled={isLoading}
							>
								{#if showConfirmPassword}
									<EyeOffIcon class="size-4" />
								{:else}
									<EyeIcon class="size-4" />
								{/if}
							</button>
						</div>
						{#if confirmPasswordError}
							<p class="text-sm text-destructive">{confirmPasswordError}</p>
						{/if}
					</div>

					<Button
						type="submit"
						class="w-full"
						disabled={isLoading || !!passwordError || !!confirmPasswordError}
					>
						{#if isLoading}
							<Spinner class="mr-2" />
							Resetting...
						{:else}
							Reset Password
						{/if}
					</Button>

					<p class="text-center text-sm text-muted-foreground">
						Remember your password?
						<a href={resolve('/login')} class="text-primary hover:underline">Sign in</a>
					</p>
				</form>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
