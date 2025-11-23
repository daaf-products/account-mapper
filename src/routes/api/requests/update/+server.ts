import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '$lib/supabase/server';

export const POST: RequestHandler = async ({ request, cookies, locals }) => {
	try {
		// Check if user is authenticated
		if (!locals.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Check if user is management
		if (locals.user.type !== 'management') {
			return json(
				{ error: 'Forbidden: Only management users can update requests' },
				{ status: 403 }
			);
		}

		const body = await request.json();
		const { requestId, status } = body;

		// Validate input
		if (!requestId || !status) {
			return json({ error: 'Missing required fields: requestId, status' }, { status: 400 });
		}

		if (!['approved', 'rejected'].includes(status)) {
			return json({ error: 'Invalid status. Must be "approved" or "rejected"' }, { status: 400 });
		}

		const supabase = createClient(cookies);

		// Update the mapping request
		const { data: updatedRequest, error: updateError } = await (supabase
			.from('account_mapping_requests')
			.update({
				status,
				reviewed_by_user_id: locals.user.id,
				reviewed_at: new Date().toISOString(),
				updated_at: new Date().toISOString()
			})
			.eq('id', requestId)
			.select(
				`
				id,
				status,
				bank_account_id,
				merchant_id
			`
			)
			.single() as any);

		if (updateError) {
			console.error('Error updating request:', updateError);
			return json({ error: 'Failed to update request' }, { status: 500 });
		}

		if (!updatedRequest) {
			return json(
				{ error: 'Request not found or you do not have permission to update it' },
				{ status: 403 }
			);
		}

		// If approved, update the bank account to map it to the merchant
		if (status === 'approved') {
			const { error: accountUpdateError } = await (supabase
				.from('bank_accounts')
				.update({
					status: 'mapped',
					mapped_to_user_id: updatedRequest.merchant_id,
					updated_at: new Date().toISOString()
				})
				.eq('id', updatedRequest.bank_account_id) as any);

			if (accountUpdateError) {
				console.error('Error updating bank account:', accountUpdateError);
				// Revert the request status update
				await (supabase
					.from('account_mapping_requests')
					.update({
						status: 'pending',
						reviewed_by_user_id: null,
						reviewed_at: null
					})
					.eq('id', requestId) as any);

				return json(
					{ error: 'Failed to map bank account to merchant. Request reverted.' },
					{ status: 500 }
				);
			}
		}

		console.log(`Request ${requestId} ${status} successfully`);

		return json({ success: true, data: updatedRequest }, { status: 200 });
	} catch (error) {
		console.error('Error in update request API:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
