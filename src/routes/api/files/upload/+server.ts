import { json, error } from '@sveltejs/kit';
import { createAdminClient } from '$lib/supabase/server';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies, locals }) => {
	try {
		// Check if user is authenticated
		if (!locals.user) {
			throw error(401, 'Unauthorized');
		}

		// Check if user is management
		if (locals.user.type !== 'management') {
			throw error(403, 'Only management users can upload files');
		}

		const formData = await request.formData();
		const file = formData.get('file') as File;

		if (!file) {
			throw error(400, 'No file provided');
		}

		// Validate file type
		if (!file.name.endsWith('.apk')) {
			throw error(400, 'File must be an APK file');
		}

		// Validate file size (50MB max)
		if (file.size > 50 * 1024 * 1024) {
			throw error(400, 'File size must be less than 50MB');
		}

		// Extract version from filename (e.g., OTP_Forwarder_v1.2.3.apk -> v1.2.3)
		const versionMatch = file.name.match(/v(\d+\.\d+\.\d+)/);
		if (!versionMatch) {
			throw error(
				400,
				'Filename must include version in format v1.2.3 (e.g., OTP_Forwarder_v1.2.3.apk)'
			);
		}
		const version = versionMatch[0]; // e.g., v1.2.3

		const supabase = createAdminClient(cookies);

		// Check if version already exists
		const { data: existingFile } = await supabase
			.from('apk_files')
			.select('id')
			.eq('version', version)
			.single();

		if (existingFile) {
			throw error(409, `Version ${version} already exists`);
		}

		// Generate unique filename
		const timestamp = Date.now();
		const uniqueFilename = `${timestamp}_${file.name}`;
		const storagePath = `apk/${uniqueFilename}`;

		// Upload file to Supabase Storage
		const fileBuffer = await file.arrayBuffer();
		const { error: uploadError } = await supabase.storage
			.from('apk-files')
			.upload(storagePath, fileBuffer, {
				contentType: 'application/vnd.android.package-archive',
				upsert: false
			});

		if (uploadError) {
			console.error('Storage upload error:', uploadError);
			throw error(500, `Failed to upload file: ${uploadError.message}`);
		}

		// Update all existing files to set is_latest = false
		await supabase.from('apk_files').update({ is_latest: false }).eq('is_latest', true);

		// Insert file metadata into database
		const { data: fileRecord, error: dbError } = await supabase
			.from('apk_files')
			.insert({
				filename: uniqueFilename,
				original_filename: file.name,
				version: version,
				file_size: file.size,
				storage_path: storagePath,
				uploaded_by_user_id: locals.user.id,
				is_latest: true // New file is always the latest
			})
			.select()
			.single();

		if (dbError) {
			console.error('Database error:', dbError);
			// Rollback: delete uploaded file
			await supabase.storage.from('apk-files').remove([storagePath]);
			throw error(500, `Failed to save file metadata: ${dbError.message}`);
		}

		console.log(`File uploaded successfully: ${file.name} (${version})`);

		return json({ success: true, file: fileRecord }, { status: 201 });
	} catch (err: any) {
		console.error('Error in upload API:', err);
		if (err.status) throw err;
		throw error(500, err.message || 'Internal server error');
	}
};

