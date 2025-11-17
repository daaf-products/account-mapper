<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { PhoneInput } from '$lib/components/ui/phone-input';
	import { Spinner } from '$lib/components/ui/spinner';
	import * as Card from '$lib/components/ui/card';
	import EyeIcon from '@lucide/svelte/icons/eye';
	import EyeOffIcon from '@lucide/svelte/icons/eye-off';
	import { toast } from 'svelte-sonner';
	import { registerSchema, type RegisterFormData } from '$lib/validations/auth.validation';
	import type { ZodError } from 'zod';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import type { ActionData } from './$types';

	let { data }: { data: ActionData } = $props();

	let fullName = $state(data?.fullName || '');
	let email = $state(data?.email || '');
	let phoneNumber = $state<string | null>(data?.phoneNumber || null);
	let password = $state('');
	let confirmPassword = $state('');
	let agreeToTerms = $state(true);
	let showPassword = $state(false);
	let showConfirmPassword = $state(false);
	let isLoading = $state(false);
	let errors = $state<Partial<Record<keyof RegisterFormData, string>>>({});

	// Handle server-side errors
	$effect(() => {
		if (data?.error) {
			toast.error('Registration failed', {
				description: data.error
			});
		}
	});

	function clearError(field: keyof RegisterFormData) {
		errors[field] = undefined;
	}

	function handleSubmit(e: Event) {
		// Clear previous errors
		errors = {};

		// Prepare form data
		const formData: RegisterFormData = {
			fullName,
			email,
			phoneNumber,
			password,
			confirmPassword,
			agreeToTerms
		};

		// Validate form data client-side
		try {
			registerSchema.parse(formData);
		} catch (error) {
			e.preventDefault();
			if (error instanceof Error && error.name === 'ZodError') {
				const zodError = error as ZodError;
				zodError.issues.forEach((issue) => {
					const field = issue.path[0] as keyof RegisterFormData;
					errors[field] = issue.message;
				});

				toast.error('Validation failed', {
					description: 'Please check the form for errors'
				});
			}
		}
	}
</script>

<div class="flex min-h-screen items-center justify-center p-4">
	<Card.Root class="w-full max-w-md">
		<Card.Header class="space-y-1 text-center">
			<Card.Title class="text-2xl font-bold">Get started</Card.Title>
			<Card.Description>Create your account and start building</Card.Description>
		</Card.Header>

		<Card.Content>
			<form
				method="POST"
				action="?/register"
				use:enhance={() => {
					isLoading = true;
					return async ({ result, update }) => {
						isLoading = false;
						if (result.type === 'redirect') {
							toast.success('Account created successfully!', {
								description: 'Welcome!...'
							});
						} else if (result.type === 'failure' && result.data) {
							const errorMessage = result.data.error;
							if (errorMessage && typeof errorMessage === 'string') {
								toast.error('Registration failed', {
									description: errorMessage
								});
							}
						}
						await update();
					};
				}}
				onsubmit={handleSubmit}
				class="space-y-4"
			>
				<div class="space-y-2">
					<Label for="fullName">Full Name</Label>
					<Input
						id="fullName"
						name="fullName"
						type="text"
						placeholder="John Doe"
						bind:value={fullName}
						oninput={() => clearError('fullName')}
						aria-invalid={errors.fullName ? 'true' : 'false'}
						disabled={isLoading}
						required
					/>
					{#if errors.fullName}
						<p class="text-sm text-destructive">{errors.fullName}</p>
					{/if}
				</div>

				<div class="space-y-2">
					<Label for="email">Work Email</Label>
					<Input
						id="email"
						name="email"
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
					<Label for="phone">Phone Number</Label>
					<PhoneInput
						name="phoneNumber"
						placeholder="Enter a phone number"
						defaultCountry="US"
						bind:value={phoneNumber}
						disabled={isLoading}
					/>
					{#if errors.phoneNumber}
						<p class="text-sm text-destructive">{errors.phoneNumber}</p>
					{/if}
				</div>

				<div class="space-y-2">
					<Label for="password">Password</Label>
					<div class="relative">
						<Input
							id="password"
							name="password"
							type={showPassword ? 'text' : 'password'}
							placeholder="Create a strong password"
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

				<div class="space-y-2">
					<Label for="confirmPassword">Confirm Password</Label>
					<div class="relative">
						<Input
							id="confirmPassword"
							name="confirmPassword"
							type={showConfirmPassword ? 'text' : 'password'}
							placeholder="Re-enter your password"
							bind:value={confirmPassword}
							oninput={() => clearError('confirmPassword')}
							aria-invalid={errors.confirmPassword ? 'true' : 'false'}
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
					{#if errors.confirmPassword}
						<p class="text-sm text-destructive">{errors.confirmPassword}</p>
					{/if}
				</div>

				<div class="flex items-start gap-2">
					<Checkbox id="terms" bind:checked={agreeToTerms} disabled={isLoading} required />
					<Label for="terms" class="cursor-pointer leading-relaxed font-normal">
						I agree to the <a href="/terms" class="text-primary hover:underline"
							>terms and conditions</a
						>
					</Label>
				</div>
				{#if errors.agreeToTerms}
					<p class="text-sm text-destructive">{errors.agreeToTerms}</p>
				{/if}

				<Button type="submit" class="w-full" disabled={!agreeToTerms || isLoading}>
					{#if isLoading}
						<Spinner class="mr-2" />
						Creating account...
					{:else}
						Create account
					{/if}
				</Button>

				<p class="text-center text-sm text-muted-foreground">
					Already have an account?
					<a href={resolve('/login')} class="text-primary hover:underline">Sign in</a>
				</p>
			</form>
		</Card.Content>
	</Card.Root>
</div>
