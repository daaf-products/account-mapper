<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
</script>

<div class="flex min-h-screen items-center justify-center p-4">
	<Card.Root class="w-full max-w-md">
		<Card.Header class="space-y-1 text-center">
			<Card.Title class="text-2xl font-bold">Account Mapper</Card.Title>
			<Card.Description>Choose an option to continue</Card.Description>
		</Card.Header>

		<Card.Content class="space-y-4">
			<Button href="/login" class="w-full">Sign In</Button>
			<Button href="/register" variant="outline" class="w-full">Create Account</Button>
		</Card.Content>
	</Card.Root>
</div>
