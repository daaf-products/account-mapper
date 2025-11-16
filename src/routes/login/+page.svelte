<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Spinner } from '$lib/components/ui/spinner';
	import * as Card from '$lib/components/ui/card';
	import EyeIcon from '@lucide/svelte/icons/eye';
	import EyeOffIcon from '@lucide/svelte/icons/eye-off';
	import { toast } from 'svelte-sonner';
	import { loginSchema, type LoginFormData } from '$lib/validations/auth.validation';
	import type { ZodError } from 'zod';

	let email = $state('');
	let password = $state('');
	let rememberMe = $state(true);
	let showPassword = $state(false);
	let isLoading = $state(false);
	let errors = $state<Partial<Record<keyof LoginFormData, string>>>({});

	function clearError(field: keyof LoginFormData) {
		errors[field] = undefined;
	}

	async function handleSubmit(e: Event) {
		e.preventDefault();

		// Clear previous errors
		errors = {};

		// Prepare form data
		const formData: LoginFormData = {
			email,
			password,
			rememberMe
		};

		// Validate form data
		try {
			const validatedData = loginSchema.parse(formData);

			// Set loading state
			isLoading = true;

			// Simulate API call
			await new Promise((resolve) => setTimeout(resolve, 2000));

			// Log validated data
			console.log('Login Form Data:', validatedData);

			// Show success toast
			toast.success('Login successful!', {
				description: 'Welcome back! Redirecting...'
			});

			// Reset loading state
			isLoading = false;

			// Here you would typically redirect to dashboard
			// goto('/dashboard');
		} catch (error) {
			isLoading = false;

			if (error instanceof Error && error.name === 'ZodError') {
				const zodError = error as ZodError;
				zodError.issues.forEach((issue) => {
					const field = issue.path[0] as keyof LoginFormData;
					errors[field] = issue.message;
				});

				toast.error('Validation failed', {
					description: 'Please check the form for errors'
				});
			} else {
				toast.error('Login failed', {
					description: 'An unexpected error occurred. Please try again.'
				});
			}
		}
	}
</script>

<div class="flex min-h-screen items-center justify-center p-4">
	<Card.Root class="w-full max-w-md">
		<Card.Header class="space-y-1 text-center">
			<Card.Title class="text-2xl font-bold">Welcome back</Card.Title>
			<Card.Description>Sign in to your account to continue</Card.Description>
		</Card.Header>

		<Card.Content>
			<form onsubmit={handleSubmit} class="space-y-4">
				<div class="space-y-2">
					<Label for="email">Email</Label>
					<Input
						id="email"
						type="email"
						placeholder="your.email@company.com"
						bind:value={email}
						oninput={() => clearError('email')}
						aria-invalid={errors.email ? 'true' : 'false'}
						disabled={isLoading}
						required
					/>
					{#if errors.email}
						<p class="text-sm text-destructive">{errors.email}</p>
					{/if}
				</div>

				<div class="space-y-2">
					<Label for="password">Password</Label>
					<div class="relative">
						<Input
							id="password"
							type={showPassword ? 'text' : 'password'}
							placeholder="Enter your password"
							bind:value={password}
							oninput={() => clearError('password')}
							aria-invalid={errors.password ? 'true' : 'false'}
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
					{#if errors.password}
						<p class="text-sm text-destructive">{errors.password}</p>
					{/if}
				</div>

				<div class="flex items-center justify-between">
					<div class="flex items-center gap-2">
						<Checkbox id="remember" bind:checked={rememberMe} disabled={isLoading} />
						<Label for="remember" class="cursor-pointer font-normal">Remember me</Label>
					</div>
					<a href="/forgot-password" class="text-sm text-primary hover:underline">
						Forgot password?
					</a>
				</div>

				<Button type="submit" class="w-full" disabled={isLoading}>
					{#if isLoading}
						<Spinner class="mr-2" />
						Signing in...
					{:else}
						Sign in
					{/if}
				</Button>

				<p class="text-center text-sm text-muted-foreground">
					Don't have an account?
					<a href="/register" class="text-primary hover:underline">Create one</a>
				</p>
			</form>
		</Card.Content>
	</Card.Root>
</div>
