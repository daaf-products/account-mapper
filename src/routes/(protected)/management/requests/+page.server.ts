import type { PageServerLoad } from './$types';
import { createClient } from '$lib/supabase/server';

type MappingRequest = {
	id: string;
	merchantId: string;
	merchantName: string;
	merchantEmail: string;
	bankAccountId: string;
	bankName: string;
	accountNumber: string;
	accountHolderName: string;
	ifscCode: string;
	status: 'pending' | 'approved' | 'rejected';
	requestNotes: string | null;
	reviewedByUserId: string | null;
	reviewedByName: string | null;
	reviewedAt: string | null;
	createdAt: string;
	updatedAt: string;
};

export const load: PageServerLoad = async ({ parent, cookies, url }) => {
	// Get user data from parent layout
	const { user } = await parent();

	// Get filter parameters from URL
	const statusFilter = url.searchParams.get('status') || 'pending';
	const searchQuery = url.searchParams.get('search') || '';

	const supabase = createClient(cookies);

	// Build query with joins
	let query = supabase.from('account_mapping_requests').select(
		`
			id,
			merchant_id,
			bank_account_id,
			status,
			request_notes,
			reviewed_by_user_id,
			reviewed_at,
			created_at,
			updated_at,
			merchant:users!account_mapping_requests_merchant_id_fkey(full_name, email),
			bank_account:bank_accounts(account_holder_name, bank_name, account_number, ifsc_code),
			reviewed_by:users!account_mapping_requests_reviewed_by_user_id_fkey(full_name)
		`
	);

	// Apply status filter
	if (statusFilter !== 'all') {
		query = (query as any).eq('status', statusFilter);
	}

	const { data: requestsData, error } = await (query as any).order('updated_at', {
		ascending: false
	});

	if (error) {
		console.error('Error fetching mapping requests:', error);
		return {
			user,
			requests: [],
			stats: {
				total: 0,
				pending: 0,
				approved: 0,
				rejected: 0
			},
			filters: {
				status: statusFilter,
				search: searchQuery
			}
		};
	}

	// Calculate statistics (based on all requests, not just filtered)
	const allRequestsQuery = supabase.from('account_mapping_requests').select('status', {
		count: 'exact'
	});
	const { data: allRequests } = await allRequestsQuery;

	const stats = {
		total: allRequests?.length || 0,
		pending: allRequests?.filter((r: any) => r.status === 'pending').length || 0,
		approved: allRequests?.filter((r: any) => r.status === 'approved').length || 0,
		rejected: allRequests?.filter((r: any) => r.status === 'rejected').length || 0
	};

	// Helper function to mask sensitive data
	const maskData = (value: string): string => {
		if (!value || value.length <= 3) return value;
		const first = value.charAt(0);
		const last = value.slice(-2);
		const stars = '*'.repeat(Math.max(value.length - 3, 1));
		return `${first}${stars}${last}`;
	};

	// Format requests
	const requests: MappingRequest[] = (requestsData || []).map((r: any) => ({
		id: r.id,
		merchantId: r.merchant_id,
		merchantName: r.merchant?.full_name || 'Unknown',
		merchantEmail: r.merchant?.email || '',
		bankAccountId: r.bank_account_id,
		bankName: r.bank_account?.bank_name || '',
		accountNumber: maskData(r.bank_account?.account_number || ''),
		accountHolderName: r.bank_account?.account_holder_name || '',
		ifscCode: maskData(r.bank_account?.ifsc_code || ''),
		status: r.status,
		requestNotes: r.request_notes,
		reviewedByUserId: r.reviewed_by_user_id,
		reviewedByName: r.reviewed_by?.full_name || null,
		reviewedAt: r.reviewed_at,
		createdAt: r.created_at,
		updatedAt: r.updated_at
	}));

	// Apply client-side search filter if provided
	let filteredRequests = requests;
	if (searchQuery) {
		const query = searchQuery.toLowerCase();
		filteredRequests = requests.filter(
			(request) =>
				request.merchantName.toLowerCase().includes(query) ||
				request.merchantEmail.toLowerCase().includes(query) ||
				request.bankName.toLowerCase().includes(query) ||
				request.accountNumber.toLowerCase().includes(query) ||
				request.accountHolderName.toLowerCase().includes(query)
		);
	}

	return {
		user,
		requests: filteredRequests,
		stats,
		filters: {
			status: statusFilter,
			search: searchQuery
		}
	};
};
