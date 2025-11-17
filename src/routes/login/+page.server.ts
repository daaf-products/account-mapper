import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { createClient } from '$lib/supabase/server';

export const load: PageServerLoad = async ({ locals }) => {
	// If user is already logged in, redirect to home
	if (locals.user) {
		throw redirect(303, '/');
	}
};

export const actions: Actions = {
	login: async ({ request, cookies, url }) => {
		const formData = await request.formData();
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;

		if (!email || !password) {
			return fail(400, {
				error: 'Email and password are required',
				email
			});
		}

		const supabase = createClient(cookies);

		const { data, error } = await supabase.auth.signInWithPassword({
			email,
			password
		});

		if (error) {
			return fail(401, {
				error: error.message || 'Invalid email or password',
				email
			});
		}

		// Check user status and redirect accordingly
		if (data.user) {
			const { data: userData } = await supabase
				.from('users')
				.select('status')
				.eq('id', data.user.id)
				.single();

			if (userData?.status === 'suspended') {
				throw redirect(303, '/suspended');
			}
			if (userData?.status === 'pending') {
				throw redirect(303, '/pending');
			}
		}

		// Redirect to home or the redirectTo parameter
		const redirectTo = url.searchParams.get('redirectTo') || '/';
		throw redirect(303, redirectTo);
	}
};
