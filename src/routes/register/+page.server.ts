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
	register: async ({ request, cookies }) => {
		const formData = await request.formData();
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;
		const fullName = formData.get('fullName') as string;
		const phoneNumber = formData.get('phoneNumber') as string | null;

		if (!email || !password || !fullName) {
			return fail(400, {
				error: 'Email, password, and full name are required',
				email,
				fullName,
				phoneNumber
			});
		}

		const supabase = createClient(cookies);

		// Calculate initials based on business logic
		const nameParts = fullName.trim().split(/\s+/);
		let initials: string;
		if (nameParts.length >= 2) {
			// First letter of first name + first letter of last name
			const firstName = nameParts[0];
			const lastName = nameParts[nameParts.length - 1];
			initials = (firstName[0] + lastName[0]).toUpperCase();
		} else if (nameParts.length === 1) {
			// First two letters of single name
			initials = nameParts[0].substring(0, 2).toUpperCase();
		} else {
			// Fallback: first two letters of email
			initials = email.substring(0, 2).toUpperCase();
		}

		// Sign up user with Supabase Auth
		// The trigger will automatically create the user record in public.users
		const { data, error } = await supabase.auth.signUp({
			email,
			password,
			options: {
				data: {
					full_name: fullName,
					phone_number: phoneNumber || null
				},
				emailRedirectTo: undefined // No email confirmation needed
			}
		});

		if (error) {
			return fail(400, {
				error: error.message || 'Registration failed. Please try again.',
				email,
				fullName,
				phoneNumber
			});
		}

		if (!data.user) {
			return fail(500, {
				error: 'Registration failed. Please try again.',
				email,
				fullName,
				phoneNumber
			});
		}

		// The database trigger should have created the user record
		// But we'll verify and update initials if needed
		const { error: updateError } = await supabase
			.from('users')
			.update({ initials })
			.eq('id', data.user.id);

		if (updateError) {
			console.error('Error updating initials:', updateError);
		}

		// Sign in the user immediately (no email confirmation)
		const { error: signInError } = await supabase.auth.signInWithPassword({
			email,
			password
		});

		if (signInError) {
			return fail(500, {
				error: 'Account created but login failed. Please try logging in.',
				email,
				fullName,
				phoneNumber
			});
		}

		// Redirect to home page
		throw redirect(303, '/');
	}
};

