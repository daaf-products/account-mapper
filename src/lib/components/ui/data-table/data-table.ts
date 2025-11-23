import { type Table, type TableOptions, type TableState, createTable } from '@tanstack/table-core';

export function createSvelteTable<TData>(options: TableOptions<TData>): Table<TData> {
	// @ts-expect-error - createTable expects resolved options but we pass raw options
	return createTable(options as any);
}

export type { Table, TableOptions, TableState };
