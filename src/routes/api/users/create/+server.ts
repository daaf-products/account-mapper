import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient, createAdminClient } from '$lib/supabase/server';

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const { fullName, email, phoneNumber, password, type, status } = await request.json();

		// Validate required fields
		if (!fullName || !email || !password) {
			return json({ error: 'Full name, email, and password are required' }, { status: 400 });
		}

		if (password.length < 6) {
			return json({ error: 'Password must be at least 6 characters' }, { status: 400 });
		}

		// Check if the requesting user is a management user
		const supabase = createClient(cookies);
		const {
			data: { user: currentUser }
		} = await supabase.auth.getUser();

		if (!currentUser) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Verify the current user is management
		const query = supabase.from('users').select('type');
		const { data: userData } = await (query as any).eq('id', currentUser.id).single();

		if (!userData || userData.type !== 'management') {
			return json({ error: 'Only management users can create new users' }, { status: 403 });
		}

		// Use admin client to create the user
		const adminClient = createAdminClient();

		// Create auth user using admin API
		const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
			email,
			password,
			email_confirm: true, // Auto-confirm email since management is creating it
			user_metadata: {
				full_name: fullName,
				phone_number: phoneNumber || null
			}
		});

		if (authError) {
			console.error('Error creating auth user:', authError);
			return json({ error: authError.message || 'Failed to create user' }, { status: 500 });
		}

		if (!authData.user) {
			return json({ error: 'Failed to create user - no user returned' }, { status: 500 });
		}

		// Generate initials from full name
		const nameParts = fullName.trim().split(' ');
		let initials = '';
		if (nameParts.length >= 2) {
			// First letter of first name + first letter of last name
			initials = (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
		} else if (nameParts.length === 1 && nameParts[0].length > 0) {
			// First two letters of the single name
			initials = nameParts[0].substring(0, 2).toUpperCase();
		} else {
			// Fallback to first two letters of email
			initials = email.substring(0, 2).toUpperCase();
		}

		// Wait a moment for the trigger to potentially create the record
		await new Promise((resolve) => setTimeout(resolve, 500));

		// Check if the user record exists
		const { data: existingUser } = await adminClient
			.from('users')
			.select('id')
			.eq('id', authData.user.id)
			.single();

		if (existingUser) {
			// User record exists (trigger worked), just update type and status
			const updateQuery = (adminClient.from('users') as any).update({
				type,
				status
			});
			const { error: updateError } = await updateQuery.eq('id', authData.user.id);

			if (updateError) {
				console.error('Error updating user type/status:', updateError);
				return json({ error: 'User created but failed to set permissions' }, { status: 500 });
			}
		} else {
			// User record doesn't exist (trigger failed), create it manually
			console.log('Trigger did not create user record, creating manually...');
			const { error: insertError } = await (adminClient.from('users') as any).insert({
				id: authData.user.id,
				email: email,
				full_name: fullName,
				phone_number: phoneNumber || null,
				initials: initials,
				type: type,
				status: status
			});

			if (insertError) {
				console.error('Error creating user record:', insertError);
				// Try to clean up the auth user
				await adminClient.auth.admin.deleteUser(authData.user.id);
				return json(
					{ error: 'Failed to create user record: ' + insertError.message },
					{ status: 500 }
				);
			}
		}

		console.log(`Successfully created user: ${email} (${authData.user.id})`);
		return json({
			success: true,
			user: {
				id: authData.user.id,
				email: authData.user.email
			}
		});
	} catch (error) {
		console.error('Error in create user handler:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Internal server error' },
			{ status: 500 }
		);
	}
};

