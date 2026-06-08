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
  operationErrors?: Partial<Record<MutationKind, QueryErrorShape | null>>;
  ignoreOrder?: boolean;
  rows: T[];
}

type StubTableInput<T extends Row> = T[] | StubTableConfig<T>;

interface StubTable<T extends Row> {
  error: QueryErrorShape | null;
  operationErrors: Partial<Record<MutationKind, QueryErrorShape | null>>;
  ignoreOrder: boolean;
  rows: T[];
}

type MutationKind = "select" | "insert" | "update";
type QueryMethod = "select" | "insert" | "update" | "eq" | "is" | "in" | "order" | "limit" | "maybeSingle" | "single";

export interface QueryTraceEntry {
  table: string;
  method: QueryMethod;
  args: unknown[];
}

function applyQuery(rows: Row[], state: QueryState, options?: { ignoreOrder?: boolean }) {
  const filteredRows = rows.filter((row) => state.filters.every((filter) => filter(row)));
  const orderedRows = options?.ignoreOrder
    ? [...filteredRows]
    : [...filteredRows].sort((left, right) => {
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
      operationErrors: {},
      ignoreOrder: false,
      rows: [...input],
    };
  }

  return {
    error: input.error ?? null,
    operationErrors: input.operationErrors ?? {},
    ignoreOrder: input.ignoreOrder ?? false,
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

  constructor(
    private readonly tableName: string,
    private readonly table: StubTable<T>,
    private readonly trace: QueryTraceEntry[],
  ) {}

  private record(method: QueryMethod, args: unknown[]) {
    this.trace.push({
      table: this.tableName,
      method,
      args,
    });
  }

  select() {
    this.record("select", []);
    return this;
  }

  insert(payload: T | T[]) {
    this.record("insert", [payload]);
    this.mutation = "insert";
    this.insertedRows = (Array.isArray(payload) ? payload : [payload]).map((row) => materializeInsertedRow(row));
    this.table.rows.push(...this.insertedRows);
    return this;
  }

  update(patch: Partial<T>) {
    this.record("update", [patch]);
    this.mutation = "update";
    this.updatePatch = patch;
    return this;
  }

  eq(key: string, value: unknown) {
    this.record("eq", [key, value]);
    this.state.filters.push((row) => row[key] === value);
    return this;
  }

  is(key: string, value: unknown) {
    this.record("is", [key, value]);
    this.state.filters.push((row) => row[key] == value);
    return this;
  }

  in(key: string, values: unknown[]) {
    this.record("in", [key, values]);
    const allowedValues = new Set(values);
    this.state.filters.push((row) => allowedValues.has(row[key]));
    return this;
  }

  order(key: string, options?: { ascending?: boolean }) {
    this.record("order", [key, options]);
    this.state.orders.push({
      key,
      ascending: options?.ascending ?? true,
    });
    return this;
  }

  limit(value: number) {
    this.record("limit", [value]);
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
      if (this.table.operationErrors.insert) {
        return {
          data: null,
          error: this.table.operationErrors.insert,
        };
      }

      return {
        data: applyQuery(this.insertedRows, this.state, { ignoreOrder: this.table.ignoreOrder }) as T[],
        error: null,
      };
    }

    if (this.mutation === "update") {
      if (this.table.operationErrors.update) {
        return {
          data: null,
          error: this.table.operationErrors.update,
        };
      }

      const matchingRows = applyQuery(this.table.rows, this.state, { ignoreOrder: this.table.ignoreOrder }) as T[];
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
      data: applyQuery(this.table.rows, this.state, { ignoreOrder: this.table.ignoreOrder }) as T[],
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
    this.record("maybeSingle", []);
    const result = this.resolveRows();
    return Promise.resolve({
      data: result.data?.[0] ?? null,
      error: result.error,
    });
  }

  single() {
    this.record("single", []);
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
  const trace: QueryTraceEntry[] = [];

  return {
    trace,
    from(table: string) {
      return new QueryBuilder(table, normalizedTables[table] ?? normalizeTable<Row>(undefined), trace);
    },
  };
}
