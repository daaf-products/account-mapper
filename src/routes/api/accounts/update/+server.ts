import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '$lib/supabase/server';

export const POST: RequestHandler = async ({ request, cookies }) => {
	const { accountId, status, mappedToUserId } = await request.json();

	// Validate required fields
	if (!accountId) {
		return json({ error: 'Account ID is required' }, { status: 400 });
	}

	if (!status) {
		return json({ error: 'Status is required' }, { status: 400 });
	}

	// Validate status
	if (!['mapped', 'unmapped', 'parked'].includes(status)) {
		return json({ error: 'Invalid status' }, { status: 400 });
	}

	const supabase = createClient(cookies);

	// Check if user is authenticated
	const {
		data: { user }
	} = await supabase.auth.getUser();

	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		// Prepare update data
		const updateData: any = {
			status,
			mapped_to_user_id: mappedToUserId || null,
			updated_at: new Date().toISOString()
		};

		// Update the account
		const { data, error } = await (supabase
			.from('bank_accounts')
			.update(updateData)
			.eq('id', accountId)
			.select() as any);

		if (error) {
			console.error('Error updating account:', error);
			return json({ error: error.message }, { status: 500 });
		}

		// Check if any rows were updated (RLS might block the update)
		if (!data || data.length === 0) {
			console.error('No rows updated. Possible RLS policy block.');
			return json(
				{ error: 'Permission denied: You do not have access to update this account' },
				{ status: 403 }
			);
		}

		console.log(`Account updated successfully. Rows affected: ${data.length}`);
		return json({ success: true, data: data[0] });
	} catch (error) {
		console.error('Error updating account:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
