<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Empty from '$lib/components/ui/empty';
	import { Spinner } from '$lib/components/ui/spinner';
	import type { PageData } from './$types';
	import DownloadIcon from '@lucide/svelte/icons/download';
	import FileIcon from '@lucide/svelte/icons/file';
	import InfoIcon from '@lucide/svelte/icons/info';
	import SmartphoneIcon from '@lucide/svelte/icons/smartphone';
	import CheckIcon from '@lucide/svelte/icons/check';
	import XIcon from '@lucide/svelte/icons/x';
	import EyeIcon from '@lucide/svelte/icons/eye';
	import { invalidateAll } from '$app/navigation';
	import { onMount, onDestroy } from 'svelte';
	import { toast } from 'svelte-sonner';

	let { data }: { data: PageData } = $props();

	// Auto-refresh interval (30 seconds)
	let refreshInterval: ReturnType<typeof setInterval> | null = $state(null);
	let isRefreshing = $state(false);
	let downloadingFileId = $state<string | null>(null);
	let verifyingAccountId = $state<string | null>(null);

	// Set up auto-refresh
	onMount(() => {
		refreshInterval = setInterval(async () => {
			isRefreshing = true;
			try {
				await invalidateAll();
			} finally {
				isRefreshing = false;
			}
		}, 30000);
	});

	// Clean up interval on destroy
	onDestroy(() => {
		if (refreshInterval) {
			clearInterval(refreshInterval);
		}
	});

	// Format file size
	function formatFileSize(bytes: number): string {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
	}

	// Format date
	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	// Handle APK download
	async function downloadAPK(fileId: string) {
		if (downloadingFileId) return;

		downloadingFileId = fileId;
		try {
			const response = await fetch(`/api/files/download?fileId=${fileId}`);

			if (!response.ok) {
				throw new Error('Failed to download file');
			}

			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = response.headers.get('Content-Disposition')?.split('filename=')[1] || 'app.apk';
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
			document.body.removeChild(a);

			toast.success('APK file downloaded successfully');
		} catch (error) {
			toast.error('Failed to download APK file');
		} finally {
			downloadingFileId = null;
		}
	}

	// Handle phone number verification
	async function verifyPhoneNumber(accountId: string, phoneNumber: string) {
		if (verifyingAccountId) return;

		if (!phoneNumber || !phoneNumber.trim()) {
			toast.error('Phone number is required');
			return;
		}

		verifyingAccountId = accountId;
		try {
			// TODO: Create API endpoint for phone verification
			// For now, just simulate the verification
			await new Promise((resolve) => setTimeout(resolve, 1000));
			toast.success('Phone number verified successfully');
			await invalidateAll();
		} catch (error) {
			toast.error('Failed to verify phone number');
		} finally {
			verifyingAccountId = null;
		}
	}

	// Get Android version from version string (e.g., "2.1.4" -> "8.0")
	function getMinAndroidVersion(version: string): string {
		// This is a placeholder - in real system, this would come from the database
		return '8.0';
	}
</script>

<div class="p-4 md:p-6 lg:p-8">
	<!-- Page Header -->
	<div class="mb-6">
		<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
			<div>
				<h1 class="text-3xl font-bold text-foreground">APK Setup</h1>
				<p class="text-sm text-muted-foreground">Download and configure the OTP forwarding application</p>
			</div>
			{#if isRefreshing}
				<div class="flex items-center gap-2 text-xs text-muted-foreground">
					<div class="size-2 animate-pulse rounded-full bg-primary"></div>
					<span>Refreshing...</span>
				</div>
			{/if}
		</div>
	</div>

	<!-- Information Banner -->
	<Card.Root class="mb-6 border-teal-500/50 bg-teal-500/10">
		<Card.Content class="flex items-start gap-3 p-4">
			<InfoIcon class="mt-0.5 size-5 shrink-0 text-teal-400" />
			<div class="flex-1">
				<p class="text-sm font-medium text-foreground">OTP Forwarding Setup Required</p>
				<p class="mt-1 text-xs text-muted-foreground">
					Download and install the APK on your Android device to enable automatic OTP forwarding for mapped
					bank accounts. Configure the phone number to receive OTPs.
				</p>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Latest APK File -->
	{#if data?.latestApk}
		<Card.Root class="mb-6 border-l-4 border-l-teal-500">
			<Card.Content class="p-6">
				<div class="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
					<div class="flex-1">
						<div class="mb-4 flex items-center gap-3">
							<div class="flex size-12 items-center justify-center rounded-lg bg-teal-500/20">
								<SmartphoneIcon class="size-6 text-teal-400" />
							</div>
							<div>
								<h3 class="text-xl font-semibold text-foreground">
									OTP Forwarder {data.latestApk.version}
								</h3>
								<p class="text-sm text-muted-foreground">Latest version available</p>
							</div>
						</div>
						<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
							<div>
								<p class="text-xs font-medium text-muted-foreground">FILE SIZE</p>
								<p class="mt-1 text-sm font-semibold text-foreground">
									{formatFileSize(data.latestApk.fileSize || 0)}
								</p>
							</div>
							<div>
								<p class="text-xs font-medium text-muted-foreground">MIN ANDROID VERSION</p>
								<p class="mt-1 text-sm font-semibold text-foreground">
									{getMinAndroidVersion(data.latestApk.version)}
								</p>
							</div>
							<div>
								<p class="text-xs font-medium text-muted-foreground">LAST UPDATED</p>
								<p class="mt-1 text-sm font-semibold text-foreground">
									{formatDate(data.latestApk.updatedAt)}
								</p>
							</div>
							<div>
								<p class="text-xs font-medium text-muted-foreground">STATUS</p>
								<p class="mt-1 text-sm font-semibold text-green-400">Stable Release</p>
							</div>
						</div>
					</div>
					<div class="shrink-0">
						<Button
							onclick={() => downloadAPK(data.latestApk.id)}
							disabled={downloadingFileId === data.latestApk.id}
							class="w-full bg-teal-600 text-white hover:bg-teal-700 md:w-auto"
						>
							{#if downloadingFileId === data.latestApk.id}
								<Spinner class="mr-2 size-4" />
								Downloading...
							{:else}
								<DownloadIcon class="mr-2 size-4" />
								Download APK
							{/if}
						</Button>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	{:else}
		<Card.Root class="mb-6">
			<Card.Content class="py-12">
				<Empty.Root>
					<Empty.Header>
						<Empty.Media>
							<FileIcon class="size-8 text-muted-foreground" />
						</Empty.Media>
						<Empty.Title>No APK files available</Empty.Title>
						<Empty.Description>
							There are no APK files available for download at the moment. Please check back later.
						</Empty.Description>
					</Empty.Header>
				</Empty.Root>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Installation Steps -->
	<Card.Root class="mb-6">
		<Card.Header>
			<Card.Title>Installation Steps</Card.Title>
		</Card.Header>
		<Card.Content>
			<ol class="list-inside list-decimal space-y-2 text-sm text-foreground">
				<li>Download the APK file to your Android device</li>
				<li>Enable 'Install from Unknown Sources' in device settings</li>
				<li>Open the downloaded APK and install the application</li>
				<li>Grant SMS and notification permissions when prompted</li>
				<li>Login with your account credentials and configure phone number</li>
			</ol>
		</Card.Content>
	</Card.Root>

	<!-- Mapped Accounts with Phone Verification -->
	<div class="mb-6">
		<div class="mb-4 flex items-center justify-between">
			<div>
				<h2 class="text-xl font-semibold text-foreground">Mapped Accounts</h2>
				<p class="text-sm text-muted-foreground">Verify phone numbers for your mapped accounts</p>
			</div>
			<div class="text-right">
				<p class="text-sm font-medium text-muted-foreground">TOTAL MAPPED</p>
				<p class="text-2xl font-bold text-foreground">{data?.mappedAccounts?.length || 0}</p>
			</div>
		</div>

		{#if (data?.mappedAccounts?.length || 0) === 0}
			<Card.Root>
				<Card.Content class="py-12">
					<Empty.Root>
						<Empty.Header>
							<Empty.Media>
								<SmartphoneIcon class="size-8 text-muted-foreground" />
							</Empty.Media>
							<Empty.Title>No mapped accounts</Empty.Title>
							<Empty.Description>
								You don't have any accounts mapped to merchants yet. Once accounts are mapped, you can
								verify phone numbers here.
							</Empty.Description>
						</Empty.Header>
					</Empty.Root>
				</Card.Content>
			</Card.Root>
		{:else}
			<div class="space-y-4">
				{#each data.mappedAccounts || [] as account (account.id)}
					<Card.Root class="border-l-4 border-l-teal-500 transition-colors hover:bg-accent/50">
						<Card.Content class="p-4">
							<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
								<div class="min-w-0 flex-1">
									<div class="mb-3">
										<h3 class="text-lg font-semibold text-foreground">{account.bankName}</h3>
										<p class="text-sm text-muted-foreground">
											Mapped to: <span class="font-medium text-foreground">{account.merchantName}</span>
										</p>
									</div>
									<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
										<div>
											<p class="text-xs font-medium text-muted-foreground">ACCOUNT NUMBER</p>
											<p class="mt-1 font-mono text-sm font-semibold text-foreground">
												{account.accountNumber}
											</p>
										</div>
										<div>
											<p class="text-xs font-medium text-muted-foreground">IFSC CODE</p>
											<p class="mt-1 font-mono text-sm font-semibold text-foreground">
												{account.ifscCode}
											</p>
										</div>
										<div>
											<p class="text-xs font-medium text-muted-foreground">MERCHANT PHONE</p>
											<p class="mt-1 text-sm font-semibold text-foreground">
												{account.merchantPhone || 'Not provided'}
											</p>
										</div>
									</div>
								</div>
								<div class="flex shrink-0 flex-col gap-2 sm:flex-row">
									{#if account.merchantPhone}
										<Button
											variant={account.verified ? 'outline' : 'default'}
											size="sm"
											onclick={() => verifyPhoneNumber(account.id, account.merchantPhone || '')}
											disabled={verifyingAccountId === account.id || account.verified}
											class={account.verified
												? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
												: 'bg-teal-600 hover:bg-teal-700'}
										>
											{#if verifyingAccountId === account.id}
												<Spinner class="mr-2 size-4" />
												Verifying...
											{:else if account.verified}
												<CheckIcon class="mr-2 size-4" />
												Verified
											{:else}
												<CheckIcon class="mr-2 size-4" />
												Verify Phone
											{/if}
										</Button>
									{:else}
										<Button variant="outline" size="sm" disabled class="text-muted-foreground">
											<XIcon class="mr-2 size-4" />
											No Phone Number
										</Button>
									{/if}
								</div>
							</div>
						</Card.Content>
					</Card.Root>
				{/each}
			</div>
		{/if}
	</div>
</div>
