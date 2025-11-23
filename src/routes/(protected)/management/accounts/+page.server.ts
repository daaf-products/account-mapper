import type { PageServerLoad } from './$types';
import { createClient } from '$lib/supabase/server';

type BankAccount = {
	id: string;
	accountHolderName: string;
	bankName: string;
	accountNumber: string;
	ifscCode: string;
	status: 'mapped' | 'unmapped' | 'parked';
	addedByType: 'management' | 'holder';
	addedByUserId: string;
	addedByUserName: string;
	mappedToUserId: string | null;
	mappedToUserName: string | null;
	createdAt: string;
	updatedAt: string;
	isMasked: boolean;
};

export const load: PageServerLoad = async ({ parent, cookies, url }) => {
	// Get user data from parent layout
	const { user } = await parent();

	// Get filter parameters from URL
	const statusFilter = url.searchParams.get('status') || 'all';
	const addedByFilter = url.searchParams.get('addedBy') || 'all';

	const supabase = createClient(cookies);

	// Build query with joins to get user names
	let query = supabase.from('bank_accounts').select(
		`
			id,
			account_holder_name,
			bank_name,
			account_number,
			ifsc_code,
			status,
			added_by_type,
			added_by_user_id,
			mapped_to_user_id,
			created_at,
			updated_at,
			added_by:users!bank_accounts_added_by_user_id_fkey(full_name),
			mapped_to:users!bank_accounts_mapped_to_user_id_fkey(full_name)
		`
	);

	// Apply filters
	if (statusFilter !== 'all') {
		query = (query as any).eq('status', statusFilter);
	}
	if (addedByFilter !== 'all') {
		query = (query as any).eq('added_by_type', addedByFilter);
	}

	const { data: accountsData, error } = await (query as any).order('created_at', {
		ascending: false
	});

	if (error) {
		console.error('Error fetching bank accounts:', error);
		return {
			user,
			accounts: [],
			stats: {
				total: 0,
				mapped: 0,
				unmapped: 0,
				parked: 0
			},
			filters: {
				status: statusFilter,
				addedBy: addedByFilter
			}
		};
	}

	// Calculate statistics (based on all accounts, not just filtered)
	const allAccountsQuery = supabase.from('bank_accounts').select('status', { count: 'exact' });
	const { data: allAccounts } = await allAccountsQuery;

	const stats = {
		total: allAccounts?.length || 0,
		mapped: allAccounts?.filter((a: any) => a.status === 'mapped').length || 0,
		unmapped: allAccounts?.filter((a: any) => a.status === 'unmapped').length || 0,
		parked: allAccounts?.filter((a: any) => a.status === 'parked').length || 0
	};

	// Helper function to mask sensitive data (first char + stars + last 2 chars)
	const maskData = (value: string): string => {
		if (!value || value.length <= 3) return value;
		const first = value.charAt(0);
		const last = value.slice(-2);
		const stars = '*'.repeat(Math.max(value.length - 3, 1));
		return `${first}${stars}${last}`;
	};

	// Format accounts - ALWAYS mask sensitive data for everyone
	const accounts: BankAccount[] = (accountsData || []).map((a: any) => ({
		id: a.id,
		accountHolderName: a.account_holder_name,
		bankName: a.bank_name,
		// ALWAYS mask account number and IFSC code
		accountNumber: maskData(a.account_number),
		ifscCode: maskData(a.ifsc_code),
		status: a.status,
		addedByType: a.added_by_type,
		addedByUserId: a.added_by_user_id,
		addedByUserName: a.added_by?.full_name || 'Unknown',
		mappedToUserId: a.mapped_to_user_id,
		mappedToUserName: a.mapped_to?.full_name || null,
		createdAt: a.created_at,
		updatedAt: a.updated_at,
		isMasked: true // Always masked, reveal based on business logic
	}));

	return {
		user,
		accounts,
		stats,
		filters: {
			status: statusFilter,
			addedBy: addedByFilter
		}
	};
};
