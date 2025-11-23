import type { PageServerLoad } from './$types';
import { createClient } from '$lib/supabase/server';

export const load: PageServerLoad = async ({ parent, cookies, url }) => {
	// Get user data from parent layout
	const { user } = await parent();

	// Get filter parameters from URL
	const statusFilter = url.searchParams.get('status') || 'all';
	const typeFilter = url.searchParams.get('type') || 'all';

	const supabase = createClient(cookies);

	// Build query with filters
	let query = supabase
		.from('users')
		.select('id, email, full_name, type, status, created_at, updated_at');

	// Apply filters
	if (statusFilter !== 'all') {
		query = (query as any).eq('status', statusFilter);
	}
	if (typeFilter !== 'all') {
		query = (query as any).eq('type', typeFilter);
	}

	const { data: usersData, error } = await (query as any).order('created_at', {
		ascending: false
	});

	if (error) {
		console.error('Error fetching users:', error);
		return {
			user,
			users: [],
			stats: {
				total: 0,
				approved: 0,
				pending: 0,
				suspended: 0
			},
			filters: {
				status: statusFilter,
				type: typeFilter
			}
		};
	}

	// Calculate statistics (based on all users, not just filtered)
	const allUsersQuery = supabase.from('users').select('status', { count: 'exact', head: false });
	const { data: allUsers } = await allUsersQuery;

	const stats = {
		total: allUsers?.length || 0,
		approved: allUsers?.filter((u: any) => u.status === 'approved').length || 0,
		pending: allUsers?.filter((u: any) => u.status === 'pending').length || 0,
		suspended: allUsers?.filter((u: any) => u.status === 'suspended').length || 0
	};

	// Format users
	const users = (usersData || []).map((u: any) => ({
		id: u.id,
		email: u.email,
		fullName: u.full_name,
		type: u.type,
		status: u.status,
		createdAt: u.created_at,
		updatedAt: u.updated_at
	}));

	return {
		user,
		users,
		stats,
		filters: {
			status: statusFilter,
			type: typeFilter
		}
	};
};
