import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '$lib/supabase/server';

export const POST: RequestHandler = async ({ request, cookies }) => {
	const { accountId, bankName, accountHolderName, accountNumber, ifscCode } = await request.json();

	// Validate required fields
	if (!accountId) {
		return json({ error: 'Account ID is required' }, { status: 400 });
	}

	if (!bankName || !accountHolderName || !accountNumber || !ifscCode) {
		return json(
			{ error: 'Bank name, account holder, account number, and IFSC code are required' },
			{ status: 400 }
		);
	}

	const supabase = createClient(cookies);

	// Check if user is authenticated
	const {
		data: { user }
	} = await supabase.auth.getUser();

	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	// Check user type - only holders can use this endpoint
	const { data: userData, error: userError } = await (supabase
		.from('users')
		.select('type, status')
		.eq('id', user.id)
		.single() as any);

	if (userError || !userData) {
		return json({ error: 'User data not found' }, { status: 404 });
	}

	if (userData.type !== 'holder') {
		return json({ error: 'Unauthorized: Only holders can update bank accounts' }, { status: 403 });
	}

	// Verify the account belongs to this holder and is unmapped
	const { data: accountData, error: accountError } = await (supabase
		.from('bank_accounts')
		.select('added_by_user_id, added_by_type, status')
		.eq('id', accountId)
		.single() as any);

	if (accountError || !accountData) {
		return json({ error: 'Account not found' }, { status: 404 });
	}

	if (accountData.added_by_user_id !== user.id || accountData.added_by_type !== 'holder') {
		return json({ error: 'You do not have permission to update this account' }, { status: 403 });
	}

	if (accountData.status !== 'unmapped') {
		return json(
			{ error: 'You can only update unmapped accounts. Mapped or parked accounts cannot be edited.' },
			{ status: 403 }
		);
	}

	try {
		// Update the account
		const { data, error } = await (supabase
			.from('bank_accounts')
			.update({
				bank_name: bankName,
				account_holder_name: accountHolderName,
				account_number: accountNumber,
				ifsc_code: ifscCode
			})
			.eq('id', accountId)
			.select() as any);

		if (error) {
			// Check for unique constraint violation
			if (error.code === '23505') {
				return json(
					{ error: 'An account with this account number and bank already exists' },
					{ status: 409 }
				);
			}

			return json({ error: error.message }, { status: 500 });
		}

		// Check if any rows were updated (RLS might block the update)
		if (!data || data.length === 0) {
			return json(
				{ error: 'Permission denied: You do not have access to update this account' },
				{ status: 403 }
			);
		}

		return json({ success: true, data: data[0] });
	} catch (error: any) {
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

