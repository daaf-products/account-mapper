import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '$lib/supabase/server';

export const GET: RequestHandler = async ({ params, cookies, locals }) => {
	try {
		// Check if user is authenticated
		if (!locals.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Check if user is merchant
		if (locals.user.type !== 'merchant') {
			return json({ error: 'Forbidden: Only merchants can view account details' }, { status: 403 });
		}

		const accountId = params.id;

		if (!accountId) {
			return json({ error: 'Missing account ID' }, { status: 400 });
		}

		const supabase = createClient(cookies);

		// Fetch account and verify it's mapped to this merchant
		const { data: account, error: accountError } = await (supabase
			.from('bank_accounts')
			.select(
				'id, account_holder_name, bank_name, account_number, ifsc_code, status, mapped_to_user_id'
			)
			.eq('id', accountId)
			.single() as any);

		if (accountError || !account) {
			return json({ error: 'Account not found' }, { status: 404 });
		}

		// Verify the account is mapped to this merchant
		if (account.mapped_to_user_id !== locals.user.id) {
			return json({ error: 'Forbidden: You do not have access to this account' }, { status: 403 });
		}

		// Verify the account is mapped or parked (not unmapped)
		if (account.status === 'unmapped') {
			return json({ error: 'Account is not mapped' }, { status: 400 });
		}

		// Return unmasked account details
		return json({
			success: true,
			data: {
				id: account.id,
				bankName: account.bank_name,
				accountNumber: account.account_number,
				ifscCode: account.ifsc_code,
				accountHolderName: account.account_holder_name,
				status: account.status
			}
		});
	} catch (error) {
		console.error('Error in unmask account API:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
