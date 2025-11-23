import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '$lib/supabase/server';

export const POST: RequestHandler = async ({ request, cookies }) => {
	const { bankName, accountHolderName, accountNumber, ifscCode } = await request.json();

	// Validate required fields
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
		return json({ error: 'Unauthorized: Only holders can add bank accounts' }, { status: 403 });
	}

	if (userData.status !== 'approved') {
		return json({ error: 'Your account must be approved to add bank accounts' }, { status: 403 });
	}

	try {
		// Create the bank account (status will be 'unmapped' by default)
		const { data: newAccount, error: createError } = await (supabase
			.from('bank_accounts')
			.insert({
				bank_name: bankName,
				account_holder_name: accountHolderName,
				account_number: accountNumber,
				ifsc_code: ifscCode,
				status: 'unmapped',
				added_by_type: 'holder',
				added_by_user_id: user.id
			})
			.select()
			.single() as any);

		if (createError) {
			// Check for unique constraint violation
			if (createError.code === '23505') {
				return json(
					{ error: 'An account with this account number and bank already exists' },
					{ status: 409 }
				);
			}

			return json({ error: createError.message }, { status: 500 });
		}

		return json({
			success: true,
			data: newAccount
		});
	} catch (error: any) {
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

