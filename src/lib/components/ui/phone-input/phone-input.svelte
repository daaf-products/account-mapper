<!--
	Installed from @ieedan/shadcn-svelte-extras
-->

<script lang="ts">
	import CountrySelector from './country-selector.svelte';
	import { defaultOptions, type PhoneInputProps } from '.';
	import { cn } from '$lib/utils/utils';
	import { TelInput, normalizedCountries } from 'svelte-tel-input';
	import 'svelte-tel-input/styles/flags.css';

	const countries = normalizedCountries;

	let {
		class: className = undefined,
		defaultCountry = null,
		country = $bindable(defaultCountry),
		options = defaultOptions,
		placeholder = $bindable(undefined),
		readonly = $bindable(false),
		disabled = $bindable(false),
		value = $bindable(null),
		valid = $bindable(false),
		detailedValue = $bindable(),
		order = undefined,
		name = undefined,
		...rest
	}: PhoneInputProps = $props();

	let el: HTMLInputElement | undefined = $state();

	export const focus = () => {
		// sort of an after update kinda thing
		setTimeout(() => {
			el?.focus();
		}, 0);
	};

	// Auto-populate country code when country changes and input is empty
	$effect(() => {
		if (country && (!value || value === null)) {
			const selectedCountry = countries.find((c) => c.iso2 === country);
			if (selectedCountry) {
				value = `+${selectedCountry.dialCode}` as any;
			}
		}
	});
</script>

<div class="flex place-items-center">
	<CountrySelector {order} {countries} bind:selected={country} onselect={focus} />
	<TelInput
		{name}
		bind:country
		bind:detailedValue
		bind:value
		bind:valid
		bind:readonly
		bind:disabled
		bind:placeholder
		bind:el
		{options}
		required
		class={cn(
			'border-l-none flex h-9 w-full min-w-0 rounded-l-none rounded-r-md border-y border-r border-input bg-background px-3 py-1 text-base text-foreground shadow-xs ring-offset-background transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground/60 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30',
			'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
			'aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40',
			className
		)}
		{...rest}
	/>
</div>
