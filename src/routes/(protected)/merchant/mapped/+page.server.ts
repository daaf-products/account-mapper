import type { PageServerLoad } from './$types';
import { createClient } from '$lib/supabase/server';

type MappedAccount = {
	id: string;
	accountHolderName: string;
	bankName: string;
	accountNumber: string;
	ifscCode: string;
	status: 'mapped' | 'parked' | 'pending';
	mappedAt: string;
	createdAt: string;
};

export const load: PageServerLoad = async ({ parent, cookies, url }) => {
	// Get user data from parent layout
	const { user } = await parent();

	const supabase = createClient(cookies);

	// Get filter and search query from URL
	const statusFilter = url.searchParams.get('status') || 'mapped';
	const searchQuery = url.searchParams.get('search') || '';

	let accountsData: any[] = [];

	// If showing pending requests, fetch from account_mapping_requests table
	if (statusFilter === 'pending') {
		let requestsQuery = (
			supabase.from('account_mapping_requests').select(
				`
				id,
				bank_account_id,
				status,
				created_at,
				bank_account:bank_accounts(id, account_holder_name, bank_name, account_number, ifsc_code, status, created_at, updated_at)
			`
			) as any
		)
			.eq('merchant_id', user.id)
			.eq('status', 'pending');

		// Apply search filter if provided
		if (searchQuery) {
			const searchPattern = `%${searchQuery}%`;
			requestsQuery = (requestsQuery as any).or(
				`bank_account.bank_name.ilike.${searchPattern},bank_account.account_number.ilike.${searchPattern},bank_account.ifsc_code.ilike.${searchPattern},bank_account.account_holder_name.ilike.${searchPattern}`
			);
		}

		requestsQuery = requestsQuery.order('created_at', { ascending: false });

		const { data: requestsData } = await requestsQuery;

		// Transform requests data to match account structure
		accountsData = (requestsData || []).map((req: any) => ({
			...req.bank_account,
			requestId: req.id,
			requestCreatedAt: req.created_at
		}));
	} else {
		// Fetch bank accounts mapped to this merchant
		let query = (
			supabase
				.from('bank_accounts')
				.select(
					'id, account_holder_name, bank_name, account_number, ifsc_code, status, created_at, updated_at'
				) as any
		).eq('mapped_to_user_id', user.id);

		// Apply status filter
		if (statusFilter === 'mapped') {
			query = query.eq('status', 'mapped');
		} else if (statusFilter === 'parked') {
			query = query.eq('status', 'parked');
		} else if (statusFilter === 'all') {
			query = query.in('status', ['mapped', 'parked']);
		}

		// Apply search filter if provided
		if (searchQuery) {
			const searchPattern = `%${searchQuery}%`;
			query = (query as any).or(
				`bank_name.ilike.${searchPattern},account_number.ilike.${searchPattern},ifsc_code.ilike.${searchPattern},account_holder_name.ilike.${searchPattern}`
			);
		}

		// Order by updated_at descending (most recently mapped first)
		query = query.order('updated_at', { ascending: false });

		const { data: mappedAccountsData } = await query;
		accountsData = mappedAccountsData || [];
	}

	// Fetch pending requests count
	const { data: pendingRequestsData } = await (
		supabase.from('account_mapping_requests').select('id') as any
	)
		.eq('merchant_id', user.id)
		.eq('status', 'pending');

	// Calculate statistics - need to fetch all mapped/parked accounts for stats
	const { data: allMappedAccountsData } = await (
		supabase.from('bank_accounts').select('status') as any
	)
		.eq('mapped_to_user_id', user.id)
		.in('status', ['mapped', 'parked']);

	const mappedCount =
		allMappedAccountsData?.filter((acc: any) => acc.status === 'mapped').length || 0;
	const parkedCount =
		allMappedAccountsData?.filter((acc: any) => acc.status === 'parked').length || 0;

	const stats = {
		mapped: mappedCount,
		pending: pendingRequestsData?.length || 0,
		parked: parkedCount
	};

	// Helper function to mask account number (last 4 digits)
	const maskAccountNumber = (value: string): string => {
		if (!value || value.length <= 4) return value;
		return `****${value.slice(-4)}`;
	};

	// Helper function to mask account holder name (first letter of each word + stars)
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

	// Helper function to mask IFSC code (first 5 chars visible)
	const maskIfscCode = (value: string): string => {
		if (!value || value.length <= 5) return value;
		return value.slice(0, 5) + '*****';
	};

	// Format accounts with masked data
	const accounts: MappedAccount[] = accountsData.map((a: any) => ({
		id: a.id,
		accountHolderName: maskAccountHolderName(a.account_holder_name),
		bankName: a.bank_name,
		accountNumber: maskAccountNumber(a.account_number),
		ifscCode: maskIfscCode(a.ifsc_code),
		status: statusFilter === 'pending' ? ('pending' as any) : a.status,
		mappedAt: a.updated_at || a.created_at || a.requestCreatedAt,
		createdAt: a.created_at || a.requestCreatedAt
	}));

	return {
		user,
		accounts,
		stats,
		filters: {
			status: statusFilter,
			search: searchQuery
		}
	};
};
