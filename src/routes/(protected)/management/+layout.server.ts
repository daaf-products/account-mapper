import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	// If user is not authenticated, redirect to login
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	// Only management users can access this section
	if (locals.user.type !== 'management') {
		throw redirect(303, '/');
	}

	return {
		user: locals.user
	};
};

