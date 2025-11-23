import type { PageServerLoad } from './$types';
import { createClient } from '$lib/supabase/server';

type BankAccount = {
	id: string;
	accountHolderName: string;
	bankName: string;
	accountNumber: string;
	ifscCode: string;
	branch?: string;
	status: 'mapped' | 'unmapped' | 'parked';
	createdAt: string;
};

export const load: PageServerLoad = async ({ parent, cookies, url }) => {
	// Get user data from parent layout
	const { user } = await parent();

	const supabase = createClient(cookies);

	// Get search query from URL
	const searchQuery = url.searchParams.get('search') || '';

	// Fetch unmapped bank accounts (available for mapping)
	let query = (
		supabase
			.from('bank_accounts')
			.select(
				'id, account_holder_name, bank_name, account_number, ifsc_code, status, created_at'
			) as any
	).eq('status', 'unmapped');

	// Apply search filter if provided
	if (searchQuery) {
		const searchPattern = `%${searchQuery}%`;
		// Supabase OR syntax: column.ilike.pattern,column2.ilike.pattern
		query = (query as any).or(
			`bank_name.ilike.${searchPattern},account_number.ilike.${searchPattern},ifsc_code.ilike.${searchPattern},account_holder_name.ilike.${searchPattern}`
		);
	}

	// Order by created_at descending
	query = query.order('created_at', { ascending: false });

	const { data: accountsData, error: accountsError } = await query;

	if (accountsError) {
		return {
			user,
			accounts: [],
			stats: {
				available: 0,
				mapped: 0,
				pending: 0
			},
			searchQuery
		};
	}

	// Get accounts that this merchant has already requested (to exclude them)
	const { data: merchantRequests } = await (supabase
		.from('account_mapping_requests')
		.select('bank_account_id')
		.eq('merchant_id', user.id)
		.in('status', ['pending', 'approved']) as any);

	// Get list of account IDs that merchant has already requested
	const requestedAccountIds = new Set(
		(merchantRequests || []).map((req: any) => req.bank_account_id)
	);

	// Filter out accounts that merchant has already requested
	const availableAccounts = (accountsData || []).filter(
		(account: any) => !requestedAccountIds.has(account.id)
	);

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
	const accounts: BankAccount[] = availableAccounts.map((a: any) => ({
		id: a.id,
		accountHolderName: maskAccountHolderName(a.account_holder_name),
		bankName: a.bank_name,
		accountNumber: maskAccountNumber(a.account_number),
		ifscCode: maskIfscCode(a.ifsc_code),
		status: a.status,
		createdAt: a.created_at
	}));

	// Get statistics
	await (supabase.from('bank_accounts').select('status') as any);

	const { data: mappedAccountsData } = await (supabase.from('bank_accounts').select('id') as any)
		.eq('mapped_to_user_id', user.id)
		.in('status', ['mapped', 'parked']);

	const { data: pendingRequestsData } = await (
		supabase.from('account_mapping_requests').select('id') as any
	)
		.eq('merchant_id', user.id)
		.eq('status', 'pending');

	const stats = {
		available: availableAccounts.length,
		mapped: mappedAccountsData?.length || 0,
		pending: pendingRequestsData?.length || 0
	};

	return {
		user,
		accounts,
		stats,
		searchQuery
	};
};
