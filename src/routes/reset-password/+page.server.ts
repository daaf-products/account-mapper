import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { createClient } from '$lib/supabase/server';

export const load: PageServerLoad = async ({ cookies, url }) => {
	const supabase = createClient(cookies);

	// Check for Supabase error parameters in URL
	const error = url.searchParams.get('error');
	const errorCode = url.searchParams.get('error_code');
	const errorDescription = url.searchParams.get('error_description');

	// If there's an error from Supabase, show error state
	if (error) {
		let errorMessage = 'This reset link is invalid or has expired.';

		if (errorCode === 'otp_expired') {
			errorMessage = 'This reset link has expired. Reset links are valid for 1 hour.';
		} else if (errorCode === 'access_denied') {
			errorMessage = 'Access denied. This reset link may have already been used.';
		} else if (errorDescription) {
			errorMessage = decodeURIComponent(errorDescription);
		}

		return {
			hasSession: false,
			error: errorMessage
		};
	}

	// Check if user has a valid session from the reset link
	const {
		data: { session }
	} = await supabase.auth.getSession();

	return {
		hasSession: !!session,
		error: null
	};
};

export const actions: Actions = {
	resetPassword: async ({ request, cookies }) => {
		const formData = await request.formData();
		const password = formData.get('password') as string;
		const confirmPassword = formData.get('confirmPassword') as string;

		if (!password || !confirmPassword) {
			return fail(400, {
				error: 'Both password fields are required'
			});
		}

		if (password !== confirmPassword) {
			return fail(400, {
				error: 'Passwords do not match'
			});
		}

		if (password.length < 8) {
			return fail(400, {
				error: 'Password must be at least 8 characters'
			});
		}

		const supabase = createClient(cookies);

		// Verify user has a valid session
		const {
			data: { session }
		} = await supabase.auth.getSession();

		if (!session) {
			return fail(401, {
				error: 'Invalid or expired reset link. Please request a new one.'
			});
		}

		// Update the password
		const { error } = await supabase.auth.updateUser({
			password
		});

		if (error) {
			return fail(500, {
				error: error.message || 'Failed to reset password. Please try again.'
			});
		}

		// Sign out to force user to sign in with new password
		await supabase.auth.signOut();

		// Redirect to login with success message
		throw redirect(303, '/login?reset=success');
	}
};
