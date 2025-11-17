import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// If user is not authenticated, redirect to unauthorized page
	if (!locals.user) {
		throw redirect(303, '/unauthorized');
	}

	// If user is not pending, redirect to appropriate page
	if (locals.user.status === 'approved') {
		throw redirect(303, '/');
	}
	if (locals.user.status === 'suspended') {
		throw redirect(303, '/suspended');
	}

	return {
		user: locals.user
	};
};
