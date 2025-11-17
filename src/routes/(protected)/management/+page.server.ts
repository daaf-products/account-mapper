import type { PageServerLoad } from './$types';
import { createClient } from '$lib/supabase/server';

export const load: PageServerLoad = async ({ parent, cookies }) => {
	// Get user data from parent layout
	const { user } = await parent();

	const supabase = createClient(cookies);

	// Fetch pending users (status = 'pending')
	// Management users should be able to read all users
	const query = supabase.from('users').select('id, email, full_name, created_at, type');
	const { data: pendingUsersData, error } = await (query as any)
		.eq('status', 'pending')
		.order('created_at', { ascending: false })
		.limit(20);

	if (error) {
		console.error('Error fetching pending users:', error);
		console.error('Error details:', JSON.stringify(error, null, 2));
		// Return empty array on error
		return {
			user,
			pendingUsers: []
		};
	}

	// Debug: Log the data to see what we're getting
	console.log('Pending users data:', JSON.stringify(pendingUsersData, null, 2));
	console.log('Pending users count:', pendingUsersData?.length || 0);
	console.log('Current user type:', user.type);

	// Format pending users with time ago
	const pendingUsers = (pendingUsersData || []).map((user: any) => {
		const createdAt = new Date(user.created_at);
		const now = new Date();
		const diffInMs = now.getTime() - createdAt.getTime();
		const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
		const diffInDays = Math.floor(diffInHours / 24);

		let timeAgo: string;
		if (diffInHours < 1) {
			const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
			timeAgo = diffInMinutes <= 1 ? 'Just now' : `${diffInMinutes} minutes ago`;
		} else if (diffInHours < 24) {
			timeAgo = `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
		} else if (diffInDays < 7) {
			timeAgo = `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
		} else {
			const diffInWeeks = Math.floor(diffInDays / 7);
			timeAgo = `${diffInWeeks} ${diffInWeeks === 1 ? 'week' : 'weeks'} ago`;
		}

		return {
			id: user.id,
			name: user.full_name,
			email: user.email,
			time: timeAgo,
			type: user.type
		};
	});

	return {
		user,
		pendingUsers
	};
};

