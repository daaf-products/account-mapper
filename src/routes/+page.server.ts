import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { createClient } from '$lib/supabase/server';

export const load: PageServerLoad = async ({ locals }) => {
	// If user is not authenticated, redirect to login
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	// Redirect based on user status
	if (locals.user.status === 'pending') {
		throw redirect(303, '/pending');
	}
	if (locals.user.status === 'suspended') {
		throw redirect(303, '/suspended');
	}

	// Redirect based on user type
	if (locals.user.type === 'management') {
		throw redirect(303, '/management');
	}
	if (locals.user.type === 'merchant') {
		throw redirect(303, '/merchant');
	}
	if (locals.user.type === 'holder') {
		throw redirect(303, '/holder');
	}

	return {
		user: locals.user
	};
};

export const actions: Actions = {
	logout: async ({ cookies }) => {
		const supabase = createClient(cookies);
		await supabase.auth.signOut();
		throw redirect(303, '/login');
	}
};
