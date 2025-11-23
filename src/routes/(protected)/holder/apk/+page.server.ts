import type { PageServerLoad } from './$types';
import { createClient } from '$lib/supabase/server';

export const load: PageServerLoad = async ({ parent, cookies }) => {
	const { user } = await parent();
	const supabase = createClient(cookies);

	// Fetch the latest APK file (is_latest = true or most recent)
	const { data: latestApkData } = await (
		supabase
			.from('apk_files')
			.select('id, filename, original_filename, version, file_size, created_at, updated_at, is_latest')
			.order('created_at', { ascending: false })
			.limit(1) as any
	);

	const latestApk = latestApkData && latestApkData.length > 0 ? latestApkData[0] : null;

	// Fetch all mapped accounts for this holder
	const { data: mappedAccountsData } = await (
		supabase
			.from('bank_accounts')
			.select(
				'id, account_holder_name, bank_name, account_number, ifsc_code, status, mapped_to_user_id, created_at, updated_at'
			) as any
	)
		.eq('added_by_user_id', user.id)
		.eq('added_by_type', 'holder')
		.eq('status', 'mapped')
		.order('updated_at', { ascending: false });

	// Get unique merchant IDs
	const merchantIds = [
		...new Set((mappedAccountsData || []).map((acc: any) => acc.mapped_to_user_id).filter(Boolean))
	];

	// Fetch merchant information including phone numbers
	let merchantInfo: Record<string, { name: string; phone: string | null; email: string }> = {};
	if (merchantIds.length > 0) {
		const { data: merchantsData } = await (
			supabase.from('users').select('id, full_name, phone_number, email') as any
		).in('id', merchantIds);

		if (merchantsData) {
			merchantInfo = merchantsData.reduce(
				(acc: Record<string, { name: string; phone: string | null; email: string }>, merchant: any) => {
					acc[merchant.id] = {
						name: merchant.full_name,
						phone: merchant.phone_number,
						email: merchant.email
					};
					return acc;
				},
				{}
			);
		}
	}

	// Helper function to mask account number
	const maskAccountNumber = (value: string): string => {
		if (!value || value.length <= 4) return value;
		return `****${value.slice(-4)}`;
	};

	// Helper function to mask account holder name
	const maskAccountHolderName = (value: string): string => {
		if (!value) return '';
		const words = value.split(' ');
		return words
			.map((word) => {
				if (word.length <= 1) return word;
				return word.charAt(0) + '*'.repeat(Math.max(word.length - 1, 1));
			})
			.join(' ');
	};

	// Format mapped accounts with merchant info
	const mappedAccounts = (mappedAccountsData || []).map((acc: any) => {
		const merchant = merchantInfo[acc.mapped_to_user_id] || null;
		return {
			id: acc.id,
			accountHolderName: maskAccountHolderName(acc.account_holder_name),
			bankName: acc.bank_name,
			accountNumber: maskAccountNumber(acc.account_number),
			ifscCode: acc.ifsc_code,
			mappedToUserId: acc.mapped_to_user_id,
			merchantName: merchant?.name || 'Unknown',
			merchantPhone: merchant?.phone || null,
			merchantEmail: merchant?.email || null,
			mappedAt: acc.updated_at,
			verified: false // This would come from a verification table in a real system
		};
	});

	return {
		user,
		latestApk: latestApk
			? {
					id: latestApk.id,
					filename: latestApk.filename,
					originalFilename: latestApk.original_filename,
					version: latestApk.version,
					fileSize: latestApk.file_size,
					createdAt: latestApk.created_at,
					updatedAt: latestApk.updated_at,
					isLatest: latestApk.is_latest
				}
			: null,
		mappedAccounts
	};
};
