import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '$lib/supabase/server';

export const POST: RequestHandler = async ({ request, cookies }) => {
	const {
		bankName,
		accountHolderName,
		accountNumber,
		ifscCode,
		status,
		addedByType,
		addedByUserId,
		mappedToUserId
	} = await request.json();

	// Validate required fields
	if (!bankName || !accountHolderName || !accountNumber || !ifscCode) {
		return json({ error: 'Bank name, account holder, account number, and IFSC code are required' }, { status: 400 });
	}

	if (!status || !['mapped', 'unmapped', 'parked'].includes(status)) {
		return json({ error: 'Valid status is required (mapped, unmapped, parked)' }, { status: 400 });
	}

	if (!addedByType || !['management', 'holder'].includes(addedByType)) {
		return json({ error: 'Valid added by type is required (management, holder)' }, { status: 400 });
	}

	if (!addedByUserId) {
		return json({ error: 'Added by user is required' }, { status: 400 });
	}

	const supabase = createClient(cookies);

	// Check if user is authenticated
	const {
		data: { user }
	} = await supabase.auth.getUser();

	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	// Check user type - only management can add accounts
	const { data: userData, error: userError } = await (supabase
		.from('users')
		.select('type')
		.eq('id', user.id)
		.single() as any);

	if (userError || !userData) {
		console.error('Error fetching user data:', userError);
		return json({ error: 'User data not found' }, { status: 404 });
	}

	if (userData.type !== 'management') {
		return json({ error: 'Unauthorized: Only management users can add bank accounts' }, { status: 403 });
	}

	try {
		// Validate that mapped status has a merchant
		if (status === 'mapped' && !mappedToUserId) {
			return json({ error: 'Mapped accounts must have a merchant assigned' }, { status: 400 });
		}

		// Create the bank account
		const { data: newAccount, error: createError } = await (supabase
			.from('bank_accounts')
			.insert({
				bank_name: bankName,
				account_holder_name: accountHolderName,
				account_number: accountNumber,
				ifsc_code: ifscCode,
				status,
				added_by_type: addedByType,
				added_by_user_id: addedByUserId,
				mapped_to_user_id: status === 'mapped' ? mappedToUserId : null
			})
			.select()
			.single() as any);

		if (createError) {
			console.error('Error creating bank account:', createError);
			
			// Check for unique constraint violation
			if (createError.code === '23505') {
				return json({ error: 'An account with this account number and bank already exists' }, { status: 409 });
			}
			
			return json({ error: createError.message }, { status: 500 });
		}

		console.log('Bank account created successfully:', newAccount.id);
		return json({
			success: true,
			data: newAccount
		});
	} catch (error) {
		console.error('Error creating bank account:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

