<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { PhoneInput } from '$lib/components/ui/phone-input';
	import { Spinner } from '$lib/components/ui/spinner';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
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
	let showTermsDialog = $state(false);

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
						I agree to the
						<button
							type="button"
							onclick={() => (showTermsDialog = true)}
							class="text-primary hover:underline"
						>
							terms and conditions
						</button>
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

<!-- Terms and Conditions Dialog -->
<Dialog.Root bind:open={showTermsDialog}>
	<Dialog.Portal>
		<Dialog.Overlay />
		<Dialog.Content class="max-h-[90vh] max-w-2xl">
			<Dialog.Header>
				<Dialog.Title>Terms and Conditions</Dialog.Title>
				<Dialog.Description>
					Please read these terms carefully before using Account Mapper.
				</Dialog.Description>
			</Dialog.Header>

			<ScrollArea class="max-h-[60vh] pr-4">
				<div class="space-y-4 text-sm">
					<section>
						<p class="font-medium">Age & Legal Capacity</p>
						<p class="text-muted-foreground">
							You must be at least 18 and legally able to enter contracts.
						</p>
					</section>

					<section>
						<p class="font-medium">Acceptance</p>
						<p class="text-muted-foreground">
							By using the app, you agree these Terms on behalf of yourself and your organization.
						</p>
					</section>

					<section>
						<p class="font-medium">User Roles</p>
						<p class="text-muted-foreground">
							Roles are Management, Holder, Merchant, or Unassigned. Capabilities depend on role and
							account status.
						</p>
					</section>

					<section>
						<p class="font-medium">Registration & Approval</p>
						<p class="text-muted-foreground">
							All new users start as Unassigned and Pending; access is limited until Management
							approval.
						</p>
						<p class="text-muted-foreground">
							Management may approve, reject, change roles, or suspend accounts at any time.
						</p>
					</section>

					<section>
						<p class="font-medium">Holders</p>
						<ul class="list-disc space-y-1 pl-5 text-muted-foreground">
							<li>
								You may submit only real, verified bank accounts you lawfully control. No dummy/test
								accounts.
							</li>
							<li>You must keep account details accurate and up to date.</li>
							<li>
								You consent to masked display of your listed accounts to Merchants and to unmasking
								only after mapping is approved.
							</li>
							<li>
								If mapping requires an OTP forwarder APK, you are responsible for installing it on a
								device you control and for complying with all carrier, device, and banking rules.
							</li>
						</ul>
					</section>

					<section>
						<p class="font-medium">Merchants</p>
						<ul class="list-disc space-y-1 pl-5 text-muted-foreground">
							<li>
								You may view masked listed accounts and request mapping; unmasked data is visible
								only for accounts mapped to you.
							</li>
							<li>
								You may hold at most 5 pending mapping requests at any time. Do not circumvent this
								limit.
							</li>
							<li>
								You must not use account data for any purpose beyond the approved mapping and
								authorized transactions for your business.
							</li>
							<li>
								You must not harvest, copy, resell, or re-publish any account data; no scraping or
								database downloads.
							</li>
						</ul>
					</section>

					<section>
						<p class="font-medium">Management</p>
						<p class="text-muted-foreground">
							May approve/reject mapping requests; manually map/unmap; set listing visibility;
							toggle auto-approval; and change user roles/status.
						</p>
						<p class="text-muted-foreground">Decisions are final; audit logs may be retained.</p>
					</section>

					<section>
						<p class="font-medium">Prohibited Conduct (all users)</p>
						<ul class="list-disc space-y-1 pl-5 text-muted-foreground">
							<li>
								No misrepresentation, identity fraud, or onboarding accounts you don't own/control.
							</li>
							<li>No reverse engineering, scraping, automated extraction, or rate-limit bypass.</li>
							<li>No attempts to access unmasked data without an active mapping.</li>
							<li>No tampering with notifications, OTP forwarding, or security controls.</li>
							<li>
								No unlawful, harmful, or abusive behavior; comply with banking, KYC/AML, and
								data-protection laws applicable to you.
							</li>
						</ul>
					</section>

					<section>
						<p class="font-medium">Data, Privacy & Security</p>
						<ul class="list-disc space-y-1 pl-5 text-muted-foreground">
							<li>
								DAAF Technologies may process your data to operate the service, prevent fraud, and
								comply with law.
							</li>
							<li>You are responsible for securing your credentials, devices, and OTP channels.</li>
							<li>Unmasked bank details are shown only to the mapped Merchant and Management.</li>
							<li>
								We may log admin actions, mapping changes, and access events for security/audit.
							</li>
						</ul>
					</section>

					<section>
						<p class="font-medium">Mapping & Unmapping</p>
						<p class="text-muted-foreground">
							Mapping is one-to-one per bank account at any point in time.
						</p>
						<p class="text-muted-foreground">
							Unmapping resets visibility (re-listed, on hold, or blocked) per Management decision.
						</p>
						<p class="text-muted-foreground">
							Auto-approval, if enabled by Management, may auto-map upon request; notifications will
							follow.
						</p>
					</section>

					<section>
						<p class="font-medium">Suspension & Termination</p>
						<p class="text-muted-foreground">
							We may suspend or terminate access for violations, risk, or legal/operational reasons.
						</p>
						<p class="text-muted-foreground">
							Suspended users cannot perform actions and may lose pending requests.
						</p>
					</section>

					<section>
						<p class="font-medium">Availability & Changes</p>
						<p class="text-muted-foreground">
							Service is provided "as is" and may change, be interrupted, or discontinued. Features
							can be added, removed, or modified without notice.
						</p>
					</section>

					<section>
						<p class="font-medium">Liability</p>
						<p class="text-muted-foreground">
							To the maximum extent permitted by law, DAAF Technologies is not liable for indirect,
							incidental, or consequential damages; total liability is limited to amounts paid to us
							for the service in the 12 months preceding the claim.
						</p>
					</section>

					<section>
						<p class="font-medium">Indemnity</p>
						<p class="text-muted-foreground">
							You agree to indemnify DAAF Technologies for losses arising from your unlawful use,
							breach of these Terms, or infringement of third-party rights.
						</p>
					</section>

					<section>
						<p class="font-medium">Notices</p>
						<p class="text-muted-foreground">
							System notifications (including approvals, rejections, APK requirement) may be
							delivered in-app, by email, or via push; you are responsible for maintaining reachable
							contact details.
						</p>
					</section>

					<section>
						<p class="font-medium">Governing Law & Venue</p>
						<p class="text-muted-foreground">
							These Terms are governed by the laws of [Jurisdiction]. Disputes will be resolved
							exclusively in the courts of [City, Country].
						</p>
					</section>

					<section>
						<p class="font-medium">Updates</p>
						<p class="text-muted-foreground">
							We may update these Terms; continued use after posting changes constitutes acceptance.
						</p>
					</section>

					<section>
						<p class="font-medium">Contact</p>
						<p class="text-muted-foreground">
							For questions or appeals: <a
								href="mailto:legal@daaf.tech"
								class="text-primary hover:underline">legal@daaf.tech</a
							>
							or
							<a href="mailto:support@daaf.tech" class="text-primary hover:underline"
								>support@daaf.tech</a
							>.
						</p>
					</section>
				</div>
			</ScrollArea>

			<Dialog.Footer class="flex-col gap-2 sm:flex-row sm:justify-end">
				<Button
					variant="outline"
					class="w-full sm:w-auto"
					onclick={() => (showTermsDialog = false)}
				>
					Close
				</Button>
				<Button
					onclick={() => {
						agreeToTerms = true;
						showTermsDialog = false;
					}}
					class="w-full sm:w-auto"
				>
					Accept
				</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
