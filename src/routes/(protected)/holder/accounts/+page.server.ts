import type { PageServerLoad } from './$types';
import { createClient } from '$lib/supabase/server';

export const load: PageServerLoad = async ({ parent, cookies, url }) => {
	const { user } = await parent();
	const supabase = createClient(cookies);

	// Get search query from URL
	const searchQuery = url.searchParams.get('search') || '';

	// Fetch all bank accounts added by this holder
	let query = (
		supabase
			.from('bank_accounts')
			.select(
				'id, account_holder_name, bank_name, account_number, ifsc_code, status, mapped_to_user_id, created_at, updated_at'
			) as any
	)
		.eq('added_by_user_id', user.id)
		.eq('added_by_type', 'holder');

	// Apply search filter if provided
	if (searchQuery) {
		const searchPattern = `%${searchQuery}%`;
		query = (query as any).or(
			`bank_name.ilike.${searchPattern},account_number.ilike.${searchPattern},ifsc_code.ilike.${searchPattern},account_holder_name.ilike.${searchPattern}`
		);
	}

	query = query.order('updated_at', { ascending: false });

	const { data: accountsData, error: accountsError } = await query;

	if (accountsError) {
		return {
			user,
			accounts: [],
			stats: {
				total: 0,
				mapped: 0,
				available: 0,
				pending: 0
			},
			searchQuery
		};
	}

	// Fetch pending mapping requests for accounts added by this holder
	const { data: pendingRequestsData } = await (
		supabase
			.from('account_mapping_requests')
			.select('bank_account_id, status')
			.eq('status', 'pending') as any
	);

	const pendingAccountIds = new Set(
		(pendingRequestsData || []).map((req: any) => req.bank_account_id)
	);

	// Fetch merchant names for mapped accounts
	const mappedAccountIds = (accountsData || [])
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

	// Calculate statistics
	const total = accountsData?.length || 0;
	const mapped = accountsData?.filter((acc: any) => acc.status === 'mapped').length || 0;
	const available = accountsData?.filter((acc: any) => acc.status === 'unmapped').length || 0;
	const pending = accountsData?.filter((acc: any) => pendingAccountIds.has(acc.id)).length || 0;

	// Helper function to mask account number (last 4 digits)
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

	// Helper function to mask IFSC code
	const maskIfscCode = (value: string): string => {
		if (!value || value.length <= 5) return value;
		return value.slice(0, 5) + '*****';
	};

	// Format accounts with masked data
	const accounts = (accountsData || []).map((a: any) => ({
		id: a.id,
		accountHolderName: maskAccountHolderName(a.account_holder_name),
		bankName: a.bank_name,
		accountNumber: maskAccountNumber(a.account_number),
		ifscCode: maskIfscCode(a.ifsc_code),
		status: a.status,
		mappedTo: a.mapped_to_user_id ? merchantNames[a.mapped_to_user_id] || 'Unknown' : null,
		mappedToUserId: a.mapped_to_user_id,
		hasPendingRequest: pendingAccountIds.has(a.id),
		createdAt: a.created_at,
		updatedAt: a.updated_at
	}));

	return {
		user,
		accounts,
		stats: {
			total,
			mapped,
			available,
			pending
		},
		searchQuery
	};
};

