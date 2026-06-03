type Row = Record<string, unknown>;

interface QueryState {
  filters: ((row: Row) => boolean)[];
  orders: { key: string; ascending: boolean }[];
}

function applyQuery(rows: Row[], state: QueryState) {
  const filteredRows = rows.filter((row) => state.filters.every((filter) => filter(row)));

  return [...filteredRows].sort((left, right) => {
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
}

class QueryBuilder<T extends Row> {
  private readonly state: QueryState = {
    filters: [],
    orders: [],
  };

  constructor(private readonly rows: T[]) {}

  select() {
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

  overrideTypes<U>() {
    return this as unknown as QueryBuilder<U & Row>;
  }

  then<TResult1 = { data: T[]; error: null }, TResult2 = never>(
    onfulfilled?: ((value: { data: T[]; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return Promise.resolve({
      data: applyQuery(this.rows, this.state),
      error: null,
    }).then(onfulfilled, onrejected);
  }

  maybeSingle() {
    const rows = applyQuery(this.rows, this.state);
    return Promise.resolve({
      data: (rows[0] as T | undefined) ?? null,
      error: null,
    });
  }
}

export function createSupabaseStub(tables: Record<string, Row[]>) {
  return {
    from(table: string) {
      return new QueryBuilder(tables[table] ?? []);
    },
  };
}
