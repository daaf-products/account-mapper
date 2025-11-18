import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '$lib/supabase/server';

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const { userId, status, type } = await request.json();

		if (!userId || !status || !type) {
			return json({ error: 'Missing required fields' }, { status: 400 });
		}

		const supabase = createClient(cookies);

		// Update the user
		const { data, error, count } = await supabase
			.from('users')
			.update({
				status,
				type,
				updated_at: new Date().toISOString()
			})
			.eq('id', userId)
			.select();

		if (error) {
			console.error('Error updating user:', error);
			return json({ error: 'Failed to update user' }, { status: 500 });
		}

		// Check if any rows were actually updated
		if (!data || data.length === 0) {
			console.error('No rows updated - RLS policy may be blocking the update');
			return json(
				{
					error: 'Update failed - you may not have permission to update this user'
				},
				{ status: 403 }
			);
		}

		console.log(`Successfully updated user ${userId}. Rows affected: ${data.length}`);
		return json({ success: true, data: data[0] });
	} catch (error) {
		console.error('Error in update handler:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

