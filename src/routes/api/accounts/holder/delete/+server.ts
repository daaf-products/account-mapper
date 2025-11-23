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
		return json({ error: 'Unauthorized: Only holders can delete bank accounts' }, { status: 403 });
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
		return json({ error: 'You do not have permission to delete this account' }, { status: 403 });
	}

	if (accountData.status !== 'unmapped') {
		return json(
			{ error: 'You can only delete unmapped accounts. Mapped or parked accounts cannot be deleted.' },
			{ status: 403 }
		);
	}

	try {
		// Delete the account
		const { error } = await (supabase.from('bank_accounts').delete().eq('id', accountId) as any);

		if (error) {
			return json({ error: error.message }, { status: 500 });
		}

		return json({ success: true });
	} catch (error: any) {
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

