import type { PageServerLoad } from './$types';
import { createClient } from '$lib/supabase/server';

type ApkFile = {
	id: string;
	filename: string;
	originalFilename: string;
	version: string;
	fileSize: number;
	storagePath: string;
	downloadCount: number;
	uploadedByUserId: string;
	uploadedByName: string;
	isLatest: boolean;
	createdAt: string;
	updatedAt: string;
};

export const load: PageServerLoad = async ({ parent, cookies }) => {
	// Get user data from parent layout
	const { user } = await parent();

	const supabase = createClient(cookies);

	// Fetch all APK files with uploader info
	const { data: filesData, error } = await (supabase
		.from('apk_files')
		.select(
			`
			id,
			filename,
			original_filename,
			version,
			file_size,
			storage_path,
			download_count,
			uploaded_by_user_id,
			is_latest,
			created_at,
			updated_at,
			uploader:users!apk_files_uploaded_by_user_id_fkey(full_name)
		`
		)
		.order('created_at', { ascending: false }) as any);

	if (error) {
		console.error('Error fetching APK files:', error);
		return {
			user,
			files: []
		};
	}

	// Format files data
	const files: ApkFile[] = (filesData || []).map((file: any) => ({
		id: file.id,
		filename: file.filename,
		originalFilename: file.original_filename,
		version: file.version,
		fileSize: file.file_size,
		storagePath: file.storage_path,
		downloadCount: file.download_count,
		uploadedByUserId: file.uploaded_by_user_id,
		uploadedByName: file.uploader?.full_name || 'Unknown',
		isLatest: file.is_latest,
		createdAt: file.created_at,
		updatedAt: file.updated_at
	}));

	return {
		user,
		files
	};
};
