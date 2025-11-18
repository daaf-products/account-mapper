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
			throw error(403, 'Only management users can delete files');
		}

		const { fileId } = await request.json();

		if (!fileId) {
			throw error(400, 'File ID is required');
		}

		const supabase = createAdminClient(cookies);

		// Get file details
		const { data: file, error: fetchError } = await supabase
			.from('apk_files')
			.select('id, storage_path, version, is_latest')
			.eq('id', fileId)
			.single();

		if (fetchError || !file) {
			throw error(404, 'File not found');
		}

		// Delete file from storage
		const { error: storageError } = await supabase.storage
			.from('apk-files')
			.remove([file.storage_path]);

		if (storageError) {
			console.error('Storage deletion error:', storageError);
			throw error(500, `Failed to delete file from storage: ${storageError.message}`);
		}

		// Delete file record from database
		const { error: dbError } = await supabase.from('apk_files').delete().eq('id', fileId);

		if (dbError) {
			console.error('Database deletion error:', dbError);
			throw error(500, `Failed to delete file record: ${dbError.message}`);
		}

		// If we deleted the latest file, update the newest remaining file to be latest
		if (file.is_latest) {
			const { data: latestFile } = await supabase
				.from('apk_files')
				.select('id')
				.order('created_at', { ascending: false })
				.limit(1)
				.single();

			if (latestFile) {
				await supabase.from('apk_files').update({ is_latest: true }).eq('id', latestFile.id);
			}
		}

		console.log(`File deleted successfully: ${file.version}`);

		return json({ success: true }, { status: 200 });
	} catch (err: any) {
		console.error('Error in delete API:', err);
		if (err.status) throw err;
		throw error(500, err.message || 'Internal server error');
	}
};

