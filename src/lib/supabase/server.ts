import { createServerClient } from '@supabase/ssr';
import type { Cookies } from '@sveltejs/kit';
import type { Database } from './database.types';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

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
			set(
				name: string,
				value: string,
				options: {
					path?: string;
					domain?: string;
					maxAge?: number;
					expires?: Date;
					httpOnly?: boolean;
					secure?: boolean;
					sameSite?: 'strict' | 'lax' | 'none';
				}
			) {
				cookies.set(name, value, options);
			},
			remove(name: string, options: { path?: string; domain?: string }) {
				cookies.delete(name, options);
			}
		}
	});
}

/**
 * Creates a Supabase admin client with service role privileges.
 * This client bypasses RLS and has full database access.
 * USE WITH CAUTION - Only use for admin operations!
 */
export function createAdminClient() {
	if (!PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
		throw new Error(
			`Missing Supabase admin environment variables. Please check your .env file.\n` +
				`Required: PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY\n` +
				`Current values: URL=${PUBLIC_SUPABASE_URL ? 'set' : 'missing'}, SERVICE_KEY=${SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'missing'}`
		);
	}

	return createServerClient<Database>(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
		cookies: {
			get() {
				return undefined;
			},
			set() {},
			remove() {}
		}
	});
}
