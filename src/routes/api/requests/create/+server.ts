import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '$lib/supabase/server';

export const POST: RequestHandler = async ({ request, cookies, locals }) => {
	try {
		// Check if user is authenticated
		if (!locals.user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Check if user is merchant
		if (locals.user.type !== 'merchant') {
			return json(
				{ error: 'Forbidden: Only merchants can create mapping requests' },
				{ status: 403 }
			);
		}

		// Check if merchant is approved
		if (locals.user.status !== 'approved') {
			return json(
				{ error: 'Forbidden: Your account must be approved to create requests' },
				{ status: 403 }
			);
		}

		const body = await request.json();
		const { bankAccountId, requestNotes } = body;

		// Validate input
		if (!bankAccountId) {
			return json({ error: 'Missing required field: bankAccountId' }, { status: 400 });
		}

		const supabase = createClient(cookies);

		// Check if account exists and is unmapped
		const { data: account, error: accountError } = await (supabase
			.from('bank_accounts')
			.select('id, status, mapped_to_user_id')
			.eq('id', bankAccountId)
			.single() as any);

		if (accountError || !account) {
			return json({ error: 'Bank account not found' }, { status: 404 });
		}

		if (account.status !== 'unmapped') {
			return json({ error: 'This account is not available for mapping' }, { status: 400 });
		}

		// Check if merchant already has a pending request for this account
		const { data: existingRequest } = await (supabase
			.from('account_mapping_requests')
			.select('id, status')
			.eq('merchant_id', locals.user.id)
			.eq('bank_account_id', bankAccountId)
			.single() as any);

		if (existingRequest) {
			if (existingRequest.status === 'pending') {
				return json(
					{ error: 'You already have a pending request for this account' },
					{ status: 400 }
				);
			}
			// If request was rejected, allow creating a new one
		}

		// Check if merchant has less than 5 pending requests (business rule)
		const { data: pendingRequests, error: pendingError } = await (supabase
			.from('account_mapping_requests')
			.select('id')
			.eq('merchant_id', locals.user.id)
			.eq('status', 'pending') as any);

		if (pendingError) {
			console.error('Error checking pending requests:', pendingError);
		}

		if (pendingRequests && pendingRequests.length >= 5) {
			return json(
				{
					error:
						'You have reached the maximum limit of 5 pending requests. Please wait for approval.'
				},
				{ status: 400 }
			);
		}

		// Create the mapping request
		const { data: newRequest, error: createError } = await (supabase
			.from('account_mapping_requests')
			.insert({
				merchant_id: locals.user.id,
				bank_account_id: bankAccountId,
				status: 'pending',
				request_notes: requestNotes || null
			})
			.select()
			.single() as any);

		if (createError) {
			console.error('Error creating mapping request:', createError);
			// Check for unique constraint violation
			if (createError.code === '23505') {
				return json({ error: 'You already have a request for this account' }, { status: 409 });
			}
			return json(
				{ error: createError.message || 'Failed to create mapping request' },
				{ status: 500 }
			);
		}

		console.log('Mapping request created successfully:', newRequest.id);

		return json({
			success: true,
			data: newRequest
		});
	} catch (error) {
		console.error('Error in create request API:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
