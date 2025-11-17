import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { createClient } from '$lib/supabase/server';

export const load: PageServerLoad = async ({ locals }) => {
	// If user is already logged in, redirect to home
	if (locals.user) {
		return { redirect: '/' };
	}
};

export const actions: Actions = {
	requestReset: async ({ request, cookies, url }) => {
		const formData = await request.formData();
		const email = formData.get('email') as string;

		if (!email) {
			return fail(400, {
				error: 'Email is required',
				email
			});
		}

		const supabase = createClient(cookies);

		// Send password reset email
		// Supabase will only send if the email exists in auth.users
		// Note: We can't query public.users because RLS blocks unauthenticated queries
		const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
			redirectTo: `${url.origin}/reset-password`
		});

		if (resetError) {
			// Check for rate limit error (429)
			if (resetError.status === 429 || resetError.message?.includes('rate limit')) {
				return fail(429, {
					error: 'Too many requests. Please wait a moment before trying again.',
					email
				});
			}

			// Check if it's a "user not found" error
			if (resetError.message?.includes('User not found') || resetError.status === 404) {
				return fail(404, {
					error: 'Account not found. Please check your email or register for a new account.',
					email
				});
			}

			return fail(500, {
				error: 'Failed to send reset email. Please try again later.',
				email
			});
		}

		// Success - Supabase has sent the email
		// Note: This always succeeds even if email doesn't exist (prevents email enumeration)
		return {
			success: true,
			message: `If an account exists with ${email}, you will receive a password reset link. Please check your inbox and spam folder.`,
			email
		};
	}
};
