
<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Spinner } from '$lib/components/ui/spinner';
	import * as Dialog from '$lib/components/ui/dialog';
	import UploadIcon from '@lucide/svelte/icons/upload';
	import FileIcon from '@lucide/svelte/icons/file';
	import DownloadIcon from '@lucide/svelte/icons/download';
	import TrashIcon from '@lucide/svelte/icons/trash-2';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import AlertTriangleIcon from '@lucide/svelte/icons/alert-triangle';
	import type { PageData } from './$types';
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';

	let { data }: { data: PageData } = $props();

	// Upload state
	let isUploading = $state(false);
	let isDragging = $state(false);
	let fileInput = $state<HTMLInputElement>();

	// Delete dialog state
	let deleteDialogOpen = $state(false);
	let fileToDelete = $state<{ id: string; filename: string } | null>(null);
	let isDeleting = $state(false);

	// File handling
	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.files && target.files[0]) {
			uploadFile(target.files[0]);
		}
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		isDragging = false;

		if (event.dataTransfer?.files && event.dataTransfer.files[0]) {
			const file = event.dataTransfer.files[0];
			if (file.name.endsWith('.apk')) {
				uploadFile(file);
			} else {
				toast.error('Please upload a valid APK file');
			}
		}
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		isDragging = true;
	}

	function handleDragLeave(event: DragEvent) {
		event.preventDefault();
		isDragging = false;
	}

	// Upload file
	async function uploadFile(file: File) {
		if (!file.name.endsWith('.apk')) {
			toast.error('Please upload a valid APK file');
			return;
		}

		if (file.size > 50 * 1024 * 1024) {
			// 50MB limit
			toast.error('File size must be less than 50MB');
			return;
		}

		// Check if filename includes version (e.g., v1.2.3)
		const versionMatch = file.name.match(/v(\d+\.\d+\.\d+)/);
		if (!versionMatch) {
			toast.error(
				'Filename must include version in format v1.2.3 (e.g., OTP_Forwarder_v1.2.3.apk)'
			);
			return;
		}

		isUploading = true;
		try {
			const formData = new FormData();
			formData.append('file', file);

			const response = await fetch('/api/files/upload', {
				method: 'POST',
				body: formData
			});

			if (!response.ok) {
				let errorMessage = 'Failed to upload file';
				try {
					const errorData = await response.json();
					errorMessage = errorData.message || errorData.error || errorMessage;
				} catch (e) {
					// If response is not JSON, use status text
					errorMessage = response.statusText || errorMessage;
				}
				throw new Error(errorMessage);
			}

			toast.success('File uploaded successfully');
			await invalidateAll();

			// Reset file input
			if (fileInput) fileInput.value = '';
		} catch (error) {
			console.error('Error uploading file:', error);
			toast.error(error instanceof Error ? error.message : 'Failed to upload file');
		} finally {
			isUploading = false;
		}
	}

	// Open delete confirmation dialog
	function openDeleteDialog(fileId: string, filename: string) {
		fileToDelete = { id: fileId, filename };
		deleteDialogOpen = true;
	}

	// Close delete dialog
	function closeDeleteDialog() {
		deleteDialogOpen = false;
		fileToDelete = null;
	}

	// Confirm and delete file
	async function confirmDelete() {
		if (!fileToDelete) return;

		isDeleting = true;
		try {
			const response = await fetch('/api/files/delete', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ fileId: fileToDelete.id })
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to delete file');
			}

			toast.success('File deleted successfully');
			closeDeleteDialog();
			await invalidateAll();
		} catch (error) {
			console.error('Error deleting file:', error);
			toast.error(error instanceof Error ? error.message : 'Failed to delete file');
		} finally {
			isDeleting = false;
		}
	}

	// Download file
	async function downloadFile(fileId: string, filename: string) {
		try {
			const response = await fetch(`/api/files/download?fileId=${fileId}`);

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to download file');
			}

			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = filename;
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
			document.body.removeChild(a);

			toast.success('Download started');
		} catch (error) {
			console.error('Error downloading file:', error);
			toast.error(error instanceof Error ? error.message : 'Failed to download file');
		}
	}

	// Format file size
	function formatFileSize(bytes: number): string {
		if (bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}

	// Format date
	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	const files = $derived(data.files || []);
</script>

<div class="space-y-6 p-4 md:p-6 lg:p-8">
	<!-- Header -->
	<div>
		<h1 class="text-2xl font-bold md:text-3xl">File Management</h1>
		<p class="mt-1 text-sm text-muted-foreground">Upload and manage APK files for holder users to download</p>
	</div>

	<!-- Upload Section -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Upload New APK File</Card.Title>
			<Card.Description>Upload OTP Forwarder APK files for holder users to download</Card.Description>
		</Card.Header>
		<Card.Content>
			<!-- Upload Area -->
			<div
				class="relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-8 transition-colors {isDragging
					? 'border-primary bg-primary/5'
					: 'hover:border-primary/50'}"
				ondragover={handleDragOver}
				ondragleave={handleDragLeave}
				ondrop={handleDrop}
				role="button"
				tabindex="0"
				onclick={() => fileInput?.click()}
				onkeydown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						fileInput?.click();
					}
				}}
			>
				<input
					type="file"
					accept=".apk"
					class="hidden"
					bind:this={fileInput}
					onchange={handleFileSelect}
					disabled={isUploading}
				/>

				{#if isUploading}
					<Spinner class="mb-4 size-12 text-primary" />
					<p class="text-lg font-medium">Uploading...</p>
					<p class="mt-1 text-sm text-muted-foreground">Please wait while we upload your file</p>
				{:else}
					<div class="mb-4 rounded-full bg-primary/10 p-4">
						<UploadIcon class="size-8 text-primary" />
					</div>
					<p class="text-lg font-medium">Click to upload or drag and drop</p>
					<p class="mt-1 text-sm text-muted-foreground">APK files only • Maximum size: 50MB</p>
				{/if}
			</div>

			<!-- Upload Guidelines -->
			<div class="mt-6 rounded-lg border border-primary/20 bg-primary/5 p-4">
				<h4 class="mb-2 text-sm font-semibold text-primary">Upload Guidelines</h4>
				<ul class="space-y-1 text-sm text-muted-foreground">
					<li>• File must be a valid APK file for the OTP Forwarder application</li>
					<li>
						• <strong>Filename must include version</strong> in format v1.2.3 (e.g.,
						OTP_Forwarder_v1.2.3.apk)
					</li>
					<li>• Each version must be unique (cannot upload same version twice)</li>
					<li>• Holder users will automatically see the latest version</li>
				</ul>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Uploaded Files Section -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Uploaded Files</Card.Title>
			<Card.Description>All APK files available for download</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if files.length === 0}
				<div class="flex flex-col items-center justify-center py-12 text-center">
					<div class="mb-4 rounded-full bg-muted p-4">
						<FileIcon class="size-8 text-muted-foreground" />
					</div>
					<h3 class="mb-2 text-lg font-semibold">No files uploaded yet</h3>
					<p class="text-sm text-muted-foreground">Upload your first APK file to get started</p>
				</div>
			{:else}
				<!-- Desktop View -->
				<div class="hidden space-y-3 md:block">
					{#each files as file}
						<div
							class="flex items-center justify-between rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent/50"
						>
							<div class="flex items-center gap-4">
								<div class="rounded-lg bg-primary/10 p-3">
									<FileIcon class="size-6 text-primary" />
								</div>
								<div>
									<div class="flex items-center gap-2">
										<p class="font-medium">{file.originalFilename}</p>
										{#if file.isLatest}
											<span class="rounded bg-teal-500/20 px-2 py-0.5 text-xs font-medium text-teal-400">
												LATEST
											</span>
										{/if}
									</div>
									<div class="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
										<span>{formatFileSize(file.fileSize)}</span>
										<span>•</span>
										<span>{file.downloadCount} downloads</span>
										<span>•</span>
										<div class="flex items-center gap-1">
											<CalendarIcon class="size-3" />
											<span>{formatDate(file.createdAt)}</span>
										</div>
									</div>
								</div>
							</div>

							<div class="flex items-center gap-2">
								<Button
									size="sm"
									variant="outline"
									class="h-9"
									onclick={() => downloadFile(file.id, file.originalFilename)}
								>
									<DownloadIcon class="mr-2 size-4" />
									Download
								</Button>
								<Button
									size="sm"
									variant="destructive"
									class="h-9"
									onclick={() => openDeleteDialog(file.id, file.originalFilename)}
								>
									<TrashIcon class="size-4" />
								</Button>
							</div>
						</div>
					{/each}
				</div>

				<!-- Mobile View -->
				<div class="space-y-3 md:hidden">
					{#each files as file}
						<Card.Root class="py-0">
							<Card.Content class="p-4">
								<div class="mb-3 flex items-start gap-3">
									<div class="rounded-lg bg-primary/10 p-2.5">
										<FileIcon class="size-5 text-primary" />
									</div>
									<div class="flex-1 min-w-0">
										<div class="flex items-center gap-2">
											<p class="font-medium text-sm truncate">{file.originalFilename}</p>
										</div>
										{#if file.isLatest}
											<span class="mt-1 inline-block rounded bg-teal-500/20 px-2 py-0.5 text-xs font-medium text-teal-400">
												LATEST
											</span>
										{/if}
									</div>
								</div>

								<div class="mb-3 space-y-1 text-xs text-muted-foreground">
									<div class="flex justify-between">
										<span>Size</span>
										<span class="font-medium">{formatFileSize(file.fileSize)}</span>
									</div>
									<div class="flex justify-between">
										<span>Downloads</span>
										<span class="font-medium">{file.downloadCount}</span>
									</div>
									<div class="flex justify-between">
										<span>Uploaded</span>
										<span class="font-medium">{formatDate(file.createdAt)}</span>
									</div>
								</div>

								<div class="flex gap-2">
									<Button
										size="sm"
										variant="outline"
										class="flex-1 h-9"
										onclick={() => downloadFile(file.id, file.originalFilename)}
									>
										<DownloadIcon class="mr-2 size-4" />
										Download
									</Button>
									<Button
										size="sm"
										variant="destructive"
										class="h-9"
										onclick={() => deleteFile(file.id, file.originalFilename)}
									>
										<TrashIcon class="size-4" />
									</Button>
								</div>
							</Card.Content>
						</Card.Root>
					{/each}
				</div>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Delete Confirmation Dialog -->
	<Dialog.Root bind:open={deleteDialogOpen}>
		<Dialog.Content class="max-w-md">
			<Dialog.Header>
				<Dialog.Title>Delete File</Dialog.Title>
				<Dialog.Description>This action cannot be undone. The file will be permanently deleted.</Dialog.Description>
			</Dialog.Header>

			{#if fileToDelete}
				<div class="py-4">
					<div class="mb-4 flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
						<AlertTriangleIcon class="mt-0.5 size-5 shrink-0 text-destructive" />
						<div class="flex-1">
							<p class="mb-1 text-sm font-semibold text-destructive">Warning</p>
							<p class="text-sm text-muted-foreground">
								Are you sure you want to delete <strong>{fileToDelete.filename}</strong>?
							</p>
						</div>
					</div>
				</div>

				<Dialog.Footer>
					<Button variant="outline" onclick={closeDeleteDialog} disabled={isDeleting}>
						Cancel
					</Button>
					<Button variant="destructive" onclick={confirmDelete} disabled={isDeleting}>
						{#if isDeleting}
							<Spinner class="mr-2 size-4" />
							Deleting...
						{:else}
							<TrashIcon class="mr-2 size-4" />
							Delete
						{/if}
					</Button>
				</Dialog.Footer>
			{/if}
		</Dialog.Content>
	</Dialog.Root>
</div>

