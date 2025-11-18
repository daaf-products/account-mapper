import type { PageServerLoad } from './$types';
import { createClient } from '$lib/supabase/server';

export const load: PageServerLoad = async ({ parent, cookies }) => {
	// Get user data from parent layout
	const { user } = await parent();

	const supabase = createClient(cookies);

	// Fetch pending users (status = 'pending')
	// Management users should be able to read all users
	const query = supabase.from('users').select('id, email, full_name, created_at, type, status');
	const { data: pendingUsersData, error } = await (query as any)
		.eq('status', 'pending')
		.order('created_at', { ascending: false })
		.limit(20);

	if (error) {
		console.error('Error fetching pending users:', error);
		console.error('Error details:', JSON.stringify(error, null, 2));
	}

	// Debug: Log first user to check data structure
	if (pendingUsersData && pendingUsersData.length > 0) {
		console.log('Sample pending user data:', {
			id: pendingUsersData[0].id,
			email: pendingUsersData[0].email,
			full_name: pendingUsersData[0].full_name,
			created_at: pendingUsersData[0].created_at,
			type: pendingUsersData[0].type,
			status: pendingUsersData[0].status
		});
	}

	// Fetch pending mapping requests
	const { data: pendingRequestsData, error: requestsError } = await (supabase
		.from('account_mapping_requests')
		.select(
			`
			id,
			merchant_id,
			bank_account_id,
			status,
			request_notes,
			created_at,
			merchant:users!account_mapping_requests_merchant_id_fkey(full_name, email),
			bank_account:bank_accounts(account_holder_name, bank_name, account_number, ifsc_code)
		`
		)
		.eq('status', 'pending')
		.order('created_at', { ascending: false })
		.limit(20) as any);

	if (requestsError) {
		console.error('Error fetching pending requests:', requestsError);
	}

	// Fetch bank account statistics
	let accountDistribution = {
		total: 0,
		mapped: { count: 0, percentage: 0 },
		unmapped: { count: 0, percentage: 0 },
		parked: { count: 0, percentage: 0 }
	};

	try {
		const { data: bankAccountsData, error: accountsError } = await (supabase
			.from('bank_accounts')
			.select('status') as any);

		if (accountsError) {
			console.error('Error fetching bank accounts:', accountsError);
			console.error('Error details:', JSON.stringify(accountsError, null, 2));
		} else {
			// Debug: Log bank accounts data
			console.log('Bank accounts data:', {
				count: bankAccountsData?.length || 0,
				sample: bankAccountsData?.slice(0, 3)
			});

			// Calculate account distribution statistics
			const totalAccounts = bankAccountsData?.length || 0;
			const mappedCount = bankAccountsData?.filter((acc: any) => acc.status === 'mapped').length || 0;
			const unmappedCount = bankAccountsData?.filter((acc: any) => acc.status === 'unmapped').length || 0;
			const parkedCount = bankAccountsData?.filter((acc: any) => acc.status === 'parked').length || 0;

			console.log('Account distribution calculated:', {
				total: totalAccounts,
				mapped: mappedCount,
				unmapped: unmappedCount,
				parked: parkedCount
			});

			accountDistribution = {
				total: totalAccounts,
				mapped: {
					count: mappedCount,
					percentage: totalAccounts > 0 ? Math.round((mappedCount / totalAccounts) * 100 * 10) / 10 : 0
				},
				unmapped: {
					count: unmappedCount,
					percentage: totalAccounts > 0 ? Math.round((unmappedCount / totalAccounts) * 100 * 10) / 10 : 0
				},
				parked: {
					count: parkedCount,
					percentage: totalAccounts > 0 ? Math.round((parkedCount / totalAccounts) * 100 * 10) / 10 : 0
				}
			};

			console.log('Final accountDistribution:', accountDistribution);
		}
	} catch (err) {
		console.error('Exception fetching bank accounts:', err);
	}

	// Format pending users with time ago
	const pendingUsers = (pendingUsersData || []).map((user: any) => {
		const createdAt = new Date(user.created_at);
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

		return {
			id: user.id,
			fullName: user.full_name,
			email: user.email,
			timeAgo: timeAgo,
			type: user.type,
			status: user.status,
			createdAt: user.created_at
		};
	});

	// Helper function to mask sensitive data
	const maskData = (value: string): string => {
		if (!value || value.length <= 3) return value;
		const first = value.charAt(0);
		const last = value.slice(-2);
		const stars = '*'.repeat(Math.max(value.length - 3, 1));
		return `${first}${stars}${last}`;
	};

	// Format pending requests with time ago
	const pendingRequests = (pendingRequestsData || []).map((request: any) => {
		const createdAt = new Date(request.created_at);
		const now = new Date();
		const diffInMs = now.getTime() - createdAt.getTime();
		const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));

		let timeAgo: string;
		if (diffInHours < 1) {
			const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
			timeAgo = diffInMinutes <= 1 ? 'Just now' : `${diffInMinutes} minutes ago`;
		} else if (diffInHours < 24) {
			timeAgo = `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
		} else {
			const diffInDays = Math.floor(diffInHours / 24);
			timeAgo = `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
		}

		return {
			id: request.id,
			merchantId: request.merchant_id,
			bankAccountId: request.bank_account_id,
			merchantName: request.merchant?.full_name || 'Unknown',
			merchantEmail: request.merchant?.email || '',
			bankName: request.bank_account?.bank_name || '',
			accountNumber: maskData(request.bank_account?.account_number || ''),
			accountHolderName: request.bank_account?.account_holder_name || '',
			ifscCode: maskData(request.bank_account?.ifsc_code || ''),
			requestNotes: request.request_notes,
			time: timeAgo
		};
	});

	return {
		user,
		pendingUsers,
		pendingRequests,
		accountDistribution
	};
};

