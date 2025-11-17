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

		// Check if user is suspended
		if (data.user) {
			const { data: userData } = await supabase
				.from('users')
				.select('status')
				.eq('id', data.user.id)
				.single();

			if (userData?.status === 'suspended') {
				await supabase.auth.signOut();
				return fail(403, {
					error: 'Your account has been suspended. Please contact support.',
					email
				});
			}
		}

		// Redirect to home or the redirectTo parameter
		const redirectTo = url.searchParams.get('redirectTo') || '/';
		throw redirect(303, redirectTo);
	}
};

