import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '$lib/supabase/server';

export const POST: RequestHandler = async ({ params, cookies, locals }) => {
	try {
		// Check if user is authenticated
		if (!locals.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const notificationId = params.id;

		if (!notificationId) {
			return json({ error: 'Missing notification ID' }, { status: 400 });
		}

		const supabase = createClient(cookies);

		// Verify the notification belongs to this user
		const { data: notification, error: fetchError } = await (supabase
			.from('notifications')
			.select('id, user_id, read_at')
			.eq('id', notificationId)
			.single() as any);

		if (fetchError || !notification) {
			return json({ error: 'Notification not found' }, { status: 404 });
		}

		if (notification.user_id !== locals.user.id) {
			return json(
				{ error: 'Forbidden: You do not have access to this notification' },
				{ status: 403 }
			);
		}

		// Mark as read (only if not already read)
		if (!notification.read_at) {
			const { error: updateError } = await (supabase
				.from('notifications')
				.update({ read_at: new Date().toISOString() })
				.eq('id', notificationId) as any);

			if (updateError) {
				return json({ error: 'Failed to update notification' }, { status: 500 });
			}
		}

		return json({
			success: true
		});
	} catch {
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
