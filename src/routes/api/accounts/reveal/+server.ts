import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '$lib/supabase/server';

export const POST: RequestHandler = async ({ request, cookies }) => {
	const { accountId } = await request.json();

	// Validate required fields
	if (!accountId) {
		return json({ error: 'Account ID is required' }, { status: 400 });
	}

	const supabase = createClient(cookies);

	// Check if user is authenticated
	const {
		data: { user }
	} = await supabase.auth.getUser();

	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	// Get user type from public.users table
	const { data: userData, error: userError } = await (supabase
		.from('users')
		.select('type')
		.eq('id', user.id)
		.single() as any);

	if (userError || !userData) {
		console.error('Error fetching user data:', userError);
		return json({ error: 'User data not found' }, { status: 404 });
	}

	try {
		// Fetch the account with unmasked data
		const { data: account, error } = await (supabase
			.from('bank_accounts')
			.select('id, account_number, ifsc_code, added_by_user_id, mapped_to_user_id')
			.eq('id', accountId)
			.single() as any);

		if (error) {
			console.error('Error fetching account:', error);
			return json({ error: error.message }, { status: 500 });
		}

		if (!account) {
			return json({ error: 'Account not found' }, { status: 404 });
		}

		// Business logic for reveal permissions
		let canReveal = false;
		let reason = '';

		if (userData.type === 'management') {
			// Management can reveal all accounts
			canReveal = true;
			reason = 'Management access';
		} else if (userData.type === 'merchant') {
			// Merchant can reveal only accounts mapped to them
			if (account.mapped_to_user_id === user.id) {
				canReveal = true;
				reason = 'Account mapped to merchant';
			} else {
				reason = 'Account not mapped to you';
			}
		} else if (userData.type === 'holder') {
			// Holder can reveal only accounts they added
			if (account.added_by_user_id === user.id) {
				canReveal = true;
				reason = 'Account added by holder';
			} else {
				reason = 'Account not added by you';
			}
		} else {
			reason = 'Insufficient permissions';
		}

		if (!canReveal) {
			console.log(`Reveal denied for user ${user.id}: ${reason}`);
			return json({ error: `Unauthorized: ${reason}` }, { status: 403 });
		}

		console.log(`Reveal granted for user ${user.id}: ${reason}`);
		return json({
			success: true,
			data: {
				accountNumber: account.account_number,
				ifscCode: account.ifsc_code
			}
		});
	} catch (error) {
		console.error('Error revealing account data:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
