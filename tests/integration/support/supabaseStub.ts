type Row = Record<string, unknown>;

interface QueryErrorShape {
  code?: string;
  details?: string;
  hint?: string;
  message: string;
}

interface QueryState {
  filters: ((row: Row) => boolean)[];
  orders: { key: string; ascending: boolean }[];
  limit: number | null;
}

interface StubTableConfig<T extends Row> {
  error?: QueryErrorShape | null;
  rows: T[];
}

type StubTableInput<T extends Row> = T[] | StubTableConfig<T>;

interface StubTable<T extends Row> {
  error: QueryErrorShape | null;
  rows: T[];
}

type MutationKind = "select" | "insert" | "update";

function applyQuery(rows: Row[], state: QueryState) {
  const filteredRows = rows.filter((row) => state.filters.every((filter) => filter(row)));
  const orderedRows = [...filteredRows].sort((left, right) => {
    for (const order of state.orders) {
      const leftValue = left[order.key];
      const rightValue = right[order.key];

      if (leftValue === rightValue) {
        continue;
      }

      if (leftValue == null) {
        return order.ascending ? -1 : 1;
      }

      if (rightValue == null) {
        return order.ascending ? 1 : -1;
      }

      if (leftValue < rightValue) {
        return order.ascending ? -1 : 1;
      }

      if (leftValue > rightValue) {
        return order.ascending ? 1 : -1;
      }
    }

    return 0;
  });

  if (state.limit == null) {
    return orderedRows;
  }

  return orderedRows.slice(0, state.limit);
}

function normalizeTable<T extends Row>(input: StubTableInput<T> | undefined): StubTable<T> {
  if (!input) {
    return {
      error: null,
      rows: [],
    };
  }

  if (Array.isArray(input)) {
    return {
      error: null,
      rows: [...input],
    };
  }

  return {
    error: input.error ?? null,
    rows: [...input.rows],
  };
}

let generatedIdCounter = 0;

function materializeInsertedRow<T extends Row>(row: T): T {
  generatedIdCounter += 1;

  return {
    completed_at: null,
    completed_by: null,
    created_at: "2026-06-05T00:00:00Z",
    updated_at: "2026-06-05T00:00:00Z",
    id: row.id ?? `stub-row-${generatedIdCounter}`,
    ...row,
  };
}

class QueryBuilder<T extends Row> {
  private readonly state: QueryState = {
    filters: [],
    orders: [],
    limit: null,
  };

  private mutation: MutationKind = "select";
  private insertedRows: T[] = [];
  private updatePatch: Partial<T> | null = null;

  constructor(private readonly table: StubTable<T>) {}

  select() {
    return this;
  }

  insert(payload: T | T[]) {
    this.mutation = "insert";
    this.insertedRows = (Array.isArray(payload) ? payload : [payload]).map((row) => materializeInsertedRow(row));
    this.table.rows.push(...this.insertedRows);
    return this;
  }

  update(patch: Partial<T>) {
    this.mutation = "update";
    this.updatePatch = patch;
    return this;
  }

  eq(key: string, value: unknown) {
    this.state.filters.push((row) => row[key] === value);
    return this;
  }

  in(key: string, values: unknown[]) {
    const allowedValues = new Set(values);
    this.state.filters.push((row) => allowedValues.has(row[key]));
    return this;
  }

  order(key: string, options?: { ascending?: boolean }) {
    this.state.orders.push({
      key,
      ascending: options?.ascending ?? true,
    });
    return this;
  }

  limit(value: number) {
    this.state.limit = value;
    return this;
  }

  overrideTypes<U>() {
    return this as unknown as QueryBuilder<U & Row>;
  }

  private resolveRows() {
    if (this.table.error) {
      return {
        data: null,
        error: this.table.error,
      };
    }

    if (this.mutation === "insert") {
      return {
        data: applyQuery(this.insertedRows, this.state) as T[],
        error: null,
      };
    }

    if (this.mutation === "update") {
      const matchingRows = applyQuery(this.table.rows, this.state) as T[];
      const patch = this.updatePatch ?? {};
      for (const row of matchingRows) {
        Object.assign(row, patch);
      }
      return {
        data: matchingRows,
        error: null,
      };
    }

    return {
      data: applyQuery(this.table.rows, this.state) as T[],
      error: null,
    };
  }

  then<TResult1 = { data: T[] | null; error: QueryErrorShape | null }, TResult2 = never>(
    onfulfilled?:
      | ((value: { data: T[] | null; error: QueryErrorShape | null }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return Promise.resolve(this.resolveRows()).then(onfulfilled, onrejected);
  }

  maybeSingle() {
    const result = this.resolveRows();
    return Promise.resolve({
      data: result.data?.[0] ?? null,
      error: result.error,
    });
  }

  single() {
    const result = this.resolveRows();
    return Promise.resolve({
      data: result.data?.[0] ?? null,
      error: result.error,
    });
  }
}

export function createSupabaseStub(tables: Record<string, StubTableInput<Row>>) {
  const normalizedTables = Object.fromEntries(
    Object.entries(tables).map(([table, input]) => [table, normalizeTable(input)]),
  ) as Record<string, StubTable<Row>>;

  return {
    from(table: string) {
      return new QueryBuilder(normalizedTables[table] ?? normalizeTable<Row>(undefined));
    },
  };
}
