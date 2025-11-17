<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Spinner } from '$lib/components/ui/spinner';
	import * as Card from '$lib/components/ui/card';
	import { toast } from 'svelte-sonner';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import MailIcon from '@lucide/svelte/icons/mail';
	import type { ActionData } from './$types';

	let { data }: { data: ActionData } = $props();

	let email = $state(data?.email || '');
	let isLoading = $state(false);
</script>

<div class="flex min-h-screen items-center justify-center p-4">
	<Card.Root class="w-full max-w-md">
		<Card.Header class="space-y-1 text-center">
			<div class="mx-auto mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10">
				<MailIcon class="size-6 text-primary" />
			</div>
			<Card.Title class="text-2xl font-bold">Forgot Password?</Card.Title>
			<Card.Description>
				Enter your email address and we'll send you a link to reset your password
			</Card.Description>
		</Card.Header>

		<Card.Content>
			<form
				method="POST"
				action="?/requestReset"
				use:enhance={() => {
					isLoading = true;
					return async ({ result, update }) => {
						isLoading = false;

						// Show toast based on result
						if (result.type === 'failure' && result.data?.error) {
							const errorMsg = result.data.error as string;

							// Determine toast title based on error
							if (errorMsg.includes('Too many requests')) {
								toast.error('Rate Limit Exceeded', {
									description: errorMsg,
									duration: 6000
								});
							} else if (errorMsg.includes('Account not found')) {
								toast.error('Account Not Found', {
									description: errorMsg,
									duration: 5000
								});
							} else {
								toast.error('Request Failed', {
									description: errorMsg,
									duration: 5000
								});
							}
						} else if (result.type === 'success') {
							// For successful form submissions, we need to check the returned data
							// TypeScript doesn't know about our custom success response structure
							const resultData = result as {
								type: 'success';
								data?: { success?: boolean; message?: string };
							};
							if (resultData.data?.success) {
								const successMsg = resultData.data.message || 'Reset link sent!';
								toast.success('Email Sent', {
									description: successMsg,
									duration: 6000
								});
							}
						}

						await update();
					};
				}}
				class="space-y-4"
			>
				<div class="space-y-2">
					<Label for="email">Email Address</Label>
					<Input
						id="email"
						name="email"
						type="email"
						placeholder="your.email@company.com"
						bind:value={email}
						disabled={isLoading}
						required
					/>
				</div>

				<Button type="submit" class="w-full" disabled={isLoading}>
					{#if isLoading}
						<Spinner class="mr-2" />
						Sending...
					{:else}
						Send Reset Link
					{/if}
				</Button>

				<div class="space-y-2 text-center text-sm">
					<p class="text-muted-foreground">
						Remember your password?
						<a href={resolve('/login')} class="text-primary hover:underline">Sign in</a>
					</p>
					<p class="text-muted-foreground">
						Don't have an account?
						<a href={resolve('/register')} class="text-primary hover:underline">Create one</a>
					</p>
				</div>
			</form>
		</Card.Content>
	</Card.Root>
</div>
