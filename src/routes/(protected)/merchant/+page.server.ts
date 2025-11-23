import type { PageServerLoad } from './$types';
import { createClient } from '$lib/supabase/server';

export const load: PageServerLoad = async ({ parent, cookies }) => {
	// Get user data from parent layout
	const { user } = await parent();

	const supabase = createClient(cookies);

	// Fetch user data with timestamps for profile status
	const { data: userData, error: userDataError } = await (
		supabase.from('users').select('status, created_at, updated_at') as any
	)
		.eq('id', user.id)
		.single();

	if (userDataError) {
		console.error('Error fetching user data:', userDataError);
	}

	// Fetch profile status information
	// For now, we'll use updated_at as the approval date
	// In a real system, you might have a separate approval tracking table
	const profileStatus = {
		status: user.status,
		approvedAt: userData?.updated_at || userData?.created_at || new Date().toISOString(),
		approvedBy: 'Admin User' // This would come from an approval tracking table in a real system
	};

	// Fetch bank accounts mapped to this merchant (both mapped and parked status)
	const { data: mappedAccountsData, error: mappedAccountsError } = await (
		supabase
			.from('bank_accounts')
			.select(
				'id, account_holder_name, bank_name, account_number, ifsc_code, status, created_at, updated_at'
			) as any
	)
		.eq('mapped_to_user_id', user.id)
		.in('status', ['mapped', 'parked'])
		.order('updated_at', { ascending: false });

	if (mappedAccountsError) {
		console.error('Error fetching mapped accounts:', mappedAccountsError);
	}

	// Fetch pending mapping requests from this merchant
	const { data: pendingRequestsData, error: requestsError } = await (
		supabase.from('account_mapping_requests').select(
			`
			id,
			merchant_id,
			bank_account_id,
			status,
			request_notes,
			created_at,
			bank_account:bank_accounts(account_holder_name, bank_name, account_number, ifsc_code)
		`
		) as any
	)
		.eq('merchant_id', user.id)
		.eq('status', 'pending')
		.order('created_at', { ascending: false })
		.limit(20);

	if (requestsError) {
		console.error('Error fetching pending requests:', requestsError);
	}

	// Fetch all mapping requests from this merchant (for statistics)
	await (supabase.from('account_mapping_requests').select('id, status') as any).eq(
		'merchant_id',
		user.id
	);

	// Calculate account overview statistics
	const allMappedAccounts = mappedAccountsData || [];
	const activeCount = allMappedAccounts.filter((acc: any) => acc.status === 'mapped').length;
	const parkedCount = allMappedAccounts.filter((acc: any) => acc.status === 'parked').length;
	const totalMappedCount = allMappedAccounts.length;
	const pendingRequestsCount = pendingRequestsData?.length || 0;

	// For merchant portal, we show:
	// - Active: mapped accounts (status = 'mapped')
	// - Pending: pending mapping requests
	// - Parked: accounts with parked status that are mapped to this merchant
	const accountOverview = {
		total: totalMappedCount,
		active: activeCount,
		pending: pendingRequestsCount,
		parked: parkedCount
	};

	// Format pending requests with time ago
	const pendingRequests = (pendingRequestsData || []).map((request: any) => {
		const createdAt = new Date(request.created_at);
		const now = new Date();
		const diffInMs = now.getTime() - createdAt.getTime();
		const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
		const diffInDays = Math.floor(diffInHours / 24);

		let timeAgo: string;
		if (diffInHours < 1) {
			const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
			timeAgo = diffInMinutes <= 1 ? 'Just now' : `${diffInMinutes} minutes ago`;
		} else if (diffInHours < 24) {
			timeAgo = `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
		} else if (diffInDays < 7) {
			timeAgo = `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
		} else {
			const diffInWeeks = Math.floor(diffInDays / 7);
			timeAgo = `${diffInWeeks} ${diffInWeeks === 1 ? 'week' : 'weeks'} ago`;
		}

		// Helper function to mask account number (last 4 digits)
		const maskAccountNumber = (accountNumber: string): string => {
			if (!accountNumber || accountNumber.length <= 4) return accountNumber;
			return `****${accountNumber.slice(-4)}`;
		};

		return {
			id: request.id,
			bankAccountId: request.bank_account_id,
			bankName: request.bank_account?.bank_name || '',
			accountNumber: maskAccountNumber(request.bank_account?.account_number || ''),
			accountHolderName: request.bank_account?.account_holder_name || '',
			ifscCode: request.bank_account?.ifsc_code || '',
			requestNotes: request.request_notes,
			time: timeAgo,
			createdAt: request.created_at
		};
	});

	// Filter to only show active (mapped) accounts in the "Currently Mapped Accounts" section
	const activeMappedAccounts = allMappedAccounts.filter((acc: any) => acc.status === 'mapped');

	// Format mapped accounts with time ago
	const mappedAccounts = activeMappedAccounts.map((account: any) => {
		const mappedAt = new Date(account.updated_at || account.created_at);
		const now = new Date();
		const diffInMs = now.getTime() - mappedAt.getTime();
		const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

		let mappedSince: string;
		if (diffInDays === 0) {
			mappedSince = 'Today';
		} else if (diffInDays === 1) {
			mappedSince = 'Yesterday';
		} else {
			mappedSince = mappedAt.toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'short',
				day: 'numeric'
			});
		}

		// Helper function to mask account number (last 4 digits)
		const maskAccountNumber = (accountNumber: string): string => {
			if (!accountNumber || accountNumber.length <= 4) return accountNumber;
			return `****${accountNumber.slice(-4)}`;
		};

		return {
			id: account.id,
			bankName: account.bank_name,
			accountNumber: maskAccountNumber(account.account_number),
			accountHolderName: account.account_holder_name,
			ifscCode: account.ifsc_code,
			status: account.status,
			mappedSince: mappedSince,
			mappedAt: account.updated_at || account.created_at
		};
	});

	// Calculate distribution for chart
	// For merchant portal, we show: Active (mapped), Pending (requests), and Parked (parked accounts)
	const totalForChart = activeCount + pendingRequestsCount + parkedCount;
	const distribution = {
		active: {
			count: activeCount,
			percentage: totalForChart > 0 ? Math.round((activeCount / totalForChart) * 100 * 10) / 10 : 0
		},
		pending: {
			count: pendingRequestsCount,
			percentage:
				totalForChart > 0 ? Math.round((pendingRequestsCount / totalForChart) * 100 * 10) / 10 : 0
		},
		parked: {
			count: parkedCount,
			percentage: totalForChart > 0 ? Math.round((parkedCount / totalForChart) * 100 * 10) / 10 : 0
		},
		total: totalForChart
	};

	return {
		user,
		profileStatus,
		accountOverview,
		pendingRequests,
		mappedAccounts,
		distribution
	};
};
