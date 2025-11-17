import { type Handle } from '@sveltejs/kit';
import { createClient } from '$lib/supabase/server';

export const handle: Handle = async ({ event, resolve }) => {
	const supabase = createClient(event.cookies);

	// Authenticate user by contacting Supabase Auth server
	const {
		data: { user }
	} = await supabase.auth.getUser();

	// Get user data from public.users table if user is authenticated
	if (user) {
		const { data: userData, error } = await supabase
			.from('users')
			.select('id, email, full_name, phone_number, initials, type, status')
			.eq('id', user.id)
			.single();

		if (userData && !error) {
			event.locals.user = userData;
		} else {
			event.locals.user = null;
		}
	} else {
		event.locals.user = null;
	}

	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range';
		}
	});
};

