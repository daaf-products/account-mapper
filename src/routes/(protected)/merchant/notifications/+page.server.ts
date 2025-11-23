import type { PageServerLoad } from './$types';
import { createClient } from '$lib/supabase/server';

type Notification = {
	id: string;
	type:
		| 'mapping_approved'
		| 'mapping_rejected'
		| 'profile_verified'
		| 'account_parked'
		| 'account_unmapped'
		| 'system';
	title: string;
	message: string;
	metadata: any;
	readAt: string | null;
	createdAt: string;
};

export const load: PageServerLoad = async ({ parent, cookies, url }) => {
	// Get user data from parent layout
	const { user } = await parent();

	const supabase = createClient(cookies);

	// Get filter from URL
	const typeFilter = url.searchParams.get('type') || 'all';

	// Fetch notifications for this merchant
	let query = (
		supabase
			.from('notifications')
			.select('id, type, title, message, metadata, read_at, created_at') as any
	).eq('user_id', user.id);

	// Apply type filter
	if (typeFilter === 'approvals') {
		query = query.eq('type', 'mapping_approved');
	} else if (typeFilter === 'rejections') {
		query = query.eq('type', 'mapping_rejected');
	} else if (typeFilter === 'system') {
		query = query.in('type', ['system', 'profile_verified', 'account_parked', 'account_unmapped']);
	}

	// Order by created_at descending (newest first)
	query = query.order('created_at', { ascending: false });

	const { data: notificationsData } = await query;

	// Fetch all notifications for statistics
	const { data: allNotificationsData } = await (
		supabase.from('notifications').select('type, read_at') as any
	).eq('user_id', user.id);

	// Calculate statistics
	const total = allNotificationsData?.length || 0;
	const unread = allNotificationsData?.filter((n: any) => !n.read_at).length || 0;
	const approvals =
		allNotificationsData?.filter((n: any) => n.type === 'mapping_approved').length || 0;
	const rejections =
		allNotificationsData?.filter((n: any) => n.type === 'mapping_rejected').length || 0;
	const system =
		allNotificationsData?.filter(
			(n: any) =>
				n.type === 'system' || n.type === 'profile_verified' || n.type === 'account_parked'
		).length || 0;

	const stats = {
		total,
		unread,
		approvals,
		rejections,
		system
	};

	// Format notifications
	const notifications: Notification[] = (notificationsData || []).map((n: any) => ({
		id: n.id,
		type: n.type,
		title: n.title,
		message: n.message,
		metadata: n.metadata || {},
		readAt: n.read_at,
		createdAt: n.created_at
	}));

	return {
		user,
		notifications,
		stats,
		filters: {
			type: typeFilter
		}
	};
};
