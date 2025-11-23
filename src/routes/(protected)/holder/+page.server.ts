import type { PageServerLoad } from './$types';
import { createClient } from '$lib/supabase/server';

export const load: PageServerLoad = async ({ parent, cookies }) => {
	// Get user data from parent layout
	const { user } = await parent();

	const supabase = createClient(cookies);

	// Fetch user data with timestamps for profile status
	const { data: userData } = await (supabase.from('users').select('status, created_at, updated_at') as any)
		.eq('id', user.id)
		.single();

	// Fetch profile status information
	const profileStatus = {
		status: user.status,
		approvedAt: userData?.updated_at || userData?.created_at || new Date().toISOString(),
		kycStatus: 'Completed' // This would come from a KYC tracking table in a real system
	};

	// Fetch all bank accounts added by this holder
	const { data: allAccountsData } = await (
		supabase
			.from('bank_accounts')
			.select(
				'id, account_holder_name, bank_name, account_number, ifsc_code, status, mapped_to_user_id, created_at, updated_at'
			) as any
	)
		.eq('added_by_user_id', user.id)
		.eq('added_by_type', 'holder')
		.order('updated_at', { ascending: false });

	// Fetch merchant names for mapped accounts
	const mappedAccountIds = (allAccountsData || [])
		.filter((acc: any) => acc.mapped_to_user_id)
		.map((acc: any) => acc.mapped_to_user_id);

	let merchantNames: Record<string, string> = {};
	if (mappedAccountIds.length > 0) {
		const { data: merchantsData } = await (
			supabase.from('users').select('id, full_name') as any
		).in('id', mappedAccountIds);

		if (merchantsData) {
			merchantNames = merchantsData.reduce((acc: Record<string, string>, merchant: any) => {
				acc[merchant.id] = merchant.full_name;
				return acc;
			}, {});
		}
	}

	// Calculate account overview statistics
	const allAccounts = allAccountsData || [];
	const totalAccounts = allAccounts.length;
	const mappedCount = allAccounts.filter((acc: any) => acc.status === 'mapped').length;
	const availableCount = allAccounts.filter((acc: any) => acc.status === 'unmapped').length;
	const pendingCount = allAccounts.filter((acc: any) => acc.status === 'parked').length;

	const accountOverview = {
		total: totalAccounts,
		mapped: mappedCount,
		available: availableCount,
		pending: pendingCount
	};

	// Format recent accounts (last 5)
	const recentAccounts = allAccounts.slice(0, 5).map((account: any) => {
		// Helper function to mask account number (last 4 digits)
		const maskAccountNumber = (accountNumber: string): string => {
			if (!accountNumber || accountNumber.length <= 4) return accountNumber;
			return `****${accountNumber.slice(-4)}`;
		};

		return {
			id: account.id,
			bankName: account.bank_name,
			accountNumber: maskAccountNumber(account.account_number),
			status: account.status === 'unmapped' ? 'available' : account.status,
			mappedTo: account.mapped_to_user_id ? merchantNames[account.mapped_to_user_id] || 'Unknown' : null,
			createdAt: account.created_at
		};
	});

	// Calculate distribution for chart
	const totalForChart = mappedCount + availableCount + pendingCount;
	const distribution = {
		mapped: {
			count: mappedCount,
			percentage: totalForChart > 0 ? Math.round((mappedCount / totalForChart) * 100 * 10) / 10 : 0
		},
		available: {
			count: availableCount,
			percentage: totalForChart > 0 ? Math.round((availableCount / totalForChart) * 100 * 10) / 10 : 0
		},
		pending: {
			count: pendingCount,
			percentage: totalForChart > 0 ? Math.round((pendingCount / totalForChart) * 100 * 10) / 10 : 0
		},
		total: totalForChart
	};

	return {
		user,
		profileStatus,
		accountOverview,
		recentAccounts,
		distribution
	};
};

