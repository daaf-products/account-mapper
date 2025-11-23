<script lang="ts">
	import { type Table, type TableOptions, createTable } from '@tanstack/table-core';

	export function createSvelteTable<TData>(options: TableOptions<TData>): Table<TData> {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		return createTable(options as any);
	}
</script>
