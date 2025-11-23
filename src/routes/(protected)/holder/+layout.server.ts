import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	// If user is not authenticated, redirect to login
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	// Only holders with approved status can access this section
	if (locals.user.type !== 'holder') {
		throw redirect(303, '/');
	}

	if (locals.user.status !== 'approved') {
		throw redirect(303, '/pending');
	}

	return {
		user: locals.user
	};
};

