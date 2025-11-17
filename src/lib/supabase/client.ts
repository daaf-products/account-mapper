import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './database.types';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export function createClient() {
	if (!PUBLIC_SUPABASE_URL || !PUBLIC_SUPABASE_ANON_KEY) {
		throw new Error(
			`Missing Supabase environment variables. Please check your .env.local file.\n` +
				`Required: PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY`
		);
	}

	return createBrowserClient<Database>(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);
}

