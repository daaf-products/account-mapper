import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	// Get user data from parent layout
	const { user } = await parent();

	return {
		user
	};
};

