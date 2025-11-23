import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '$lib/supabase/server';

export const POST: RequestHandler = async ({ cookies, locals }) => {
	try {
		// Check if user is authenticated
		if (!locals.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const supabase = createClient(cookies);

		// Mark all unread notifications as read for this user
		const { error: updateError } = await (supabase
			.from('notifications')
			.update({ read_at: new Date().toISOString() })
			.eq('user_id', locals.user.id)
			.is('read_at', null) as any);

		if (updateError) {
			return json({ error: 'Failed to mark all notifications as read' }, { status: 500 });
		}

		return json({
			success: true
		});
	} catch {
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
