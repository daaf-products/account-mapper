# Account Mapper

<img  src="/static/logo.svg" alt="logo" width=50/>

The goal of this application is to map bank accounts to the registered merchants. Bank account can be listed by Management team or holders team. Everything must be approved by the Management team.

## Three types of users

1. **Management** - Contains users who would add bank accounts which are masked, approve users on registrations and add their type. They will also handle account status [Pending, Active, Suspended]. They can approve or reject request for bank mapping by merchants. They will upload and maintain the APK file to be downloaded by the holders.
2. **Merchants** - They can register an account, ask for a masked bank account to be mapped to them so that, its gets unmasked and they can see the details of that bank account.
3. **Holders** - They can register account, and once approved, they can add their bank account with masked values. They can also downloaded the OTP forwarder APK for setting up OTP forwarding.

## Packages Used

- Shadecn for Components - [svelte-kit](https://svelte.dev/docs/kit/introduction)
- Supabase as BaaS - [supabase](https://supabase.com/)
- SvelteKit for Web - [shadecn-svelte](https://www.shadcn-svelte.com/docs)
- Has little bit of Shadecn Extras - [shadecn-extras](https://www.shadcn-svelte-extras.com/docs/introduction)
- Lucide Svelte - [lucide-svelte](https://lucide.dev/guide/packages/lucide-svelte)
