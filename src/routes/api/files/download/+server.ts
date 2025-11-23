import { error } from '@sveltejs/kit';
import { createClient } from '$lib/supabase/server';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, cookies, locals }) => {
	try {
		// Check if user is authenticated
		if (!locals.user) {
			throw error(401, 'Unauthorized');
		}

		// Only management and holder users can download files
		if (locals.user.type !== 'management' && locals.user.type !== 'holder') {
			throw error(403, 'Only management and holder users can download files');
		}

		const fileId = url.searchParams.get('fileId');

		if (!fileId) {
			throw error(400, 'File ID is required');
		}

		const supabase = createClient(cookies);

		// Get file details
		const { data: file, error: fetchError } = await supabase
			.from('apk_files')
			.select('id, storage_path, original_filename, download_count')
			.eq('id', fileId)
			.single();

		if (fetchError || !file) {
			throw error(404, 'File not found');
		}

		// Download file from storage
		const { data: fileData, error: downloadError } = await supabase.storage
			.from('apk-files')
			.download(file.storage_path);

		if (downloadError || !fileData) {
			console.error('Storage download error:', downloadError);
			throw error(500, 'Failed to download file');
		}

		// Increment download count (non-blocking)
		supabase
			.from('apk_files')
			.update({ download_count: file.download_count + 1 })
			.eq('id', fileId)
			.then(({ error: updateError }) => {
				if (updateError) {
					console.error('Failed to update download count:', updateError);
				}
			});

		// Return file as response
		return new Response(fileData, {
			headers: {
				'Content-Type': 'application/vnd.android.package-archive',
				'Content-Disposition': `attachment; filename="${file.original_filename}"`
			}
		});
	} catch (err: any) {
		console.error('Error in download API:', err);
		if (err.status) throw err;
		throw error(500, err.message || 'Internal server error');
	}
};
