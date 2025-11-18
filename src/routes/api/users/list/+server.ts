import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '$lib/supabase/server';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const type = url.searchParams.get('type');

	const supabase = createClient(cookies);

	// Check if user is authenticated
	const {
		data: { user }
	} = await supabase.auth.getUser();

	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		// Build query
		let query = supabase.from('users').select('id, full_name, type, status');

		// Apply type filter if provided
		if (type && type !== 'all') {
			query = (query as any).eq('type', type);
		}

		// Only get approved users
		query = (query as any).eq('status', 'approved');

		// Order by name
		query = query.order('full_name', { ascending: true });

		const { data: users, error } = await query;

		if (error) {
			console.error('Error fetching users:', error);
			return json({ error: error.message }, { status: 500 });
		}

		return json({
			users: users.map((u: any) => ({
				id: u.id,
				fullName: u.full_name,
				type: u.type,
				status: u.status
			}))
		});
	} catch (error) {
		console.error('Error fetching users:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};

