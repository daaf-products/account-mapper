// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user: {
				id: string;
				email: string;
				full_name: string;
				phone_number: string | null;
				initials: string;
				type: 'management' | 'holder' | 'merchant' | 'unassigned';
				status: 'pending' | 'approved' | 'suspended';
			} | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
