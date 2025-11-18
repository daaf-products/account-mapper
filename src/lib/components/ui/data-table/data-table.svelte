import {
	type Table,
	type TableOptions,
	type TableState,
	createTable
} from "@tanstack/table-core";

export function createSvelteTable<TData>(options: TableOptions<TData>): Table<TData> {
	return createTable(options);
}

export type { Table, TableOptions, TableState };
