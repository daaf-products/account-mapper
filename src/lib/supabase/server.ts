import { createServerClient } from '@supabase/ssr';
import type { Cookies } from '@sveltejs/kit';
import type { Database } from './database.types';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export function createClient(cookies: Cookies) {
	if (!PUBLIC_SUPABASE_URL || !PUBLIC_SUPABASE_ANON_KEY) {
		throw new Error(
			`Missing Supabase environment variables. Please check your .env.local file.\n` +
				`Required: PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY\n` +
				`Current values: URL=${PUBLIC_SUPABASE_URL ? 'set' : 'missing'}, KEY=${PUBLIC_SUPABASE_ANON_KEY ? 'set' : 'missing'}`
		);
	}

	return createServerClient<Database>(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		cookies: {
			get(name: string) {
				return cookies.get(name);
			},
			set(name: string, value: string, options: any) {
				cookies.set(name, value, options);
			},
			remove(name: string, options: any) {
				cookies.delete(name, options);
			}
		}
	});
}

