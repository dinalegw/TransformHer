import { SEED_BOOKS, type SeedBook } from '@/lib/seed'

type DbQuery<T> = {
  select: () => DbQuery<T>
  from: (table: unknown) => DbQuery<T>
  where: (...args: unknown[]) => DbQuery<T>
  orderBy: (...args: unknown[]) => DbQuery<T>
  limit: (n: number) => Promise<T[]>
  groupBy: (...args: unknown[]) => Promise<{ category: string; count: number }[]>
}

function createInMemoryDb() {
  const data = [...SEED_BOOKS]

  function query<T>(): DbQuery<T> {
    let conditions: Array<(item: SeedBook) => boolean> = []
    let sortFn: ((a: SeedBook, b: SeedBook) => number) | null = null
    let limitCount = Infinity
    let groupByField: string | null = null

    const chain: DbQuery<T> = {
      select: () => chain,
      from: () => chain,
      where: (...args: unknown[]) => {
        const condition = args[0] as (item: SeedBook) => boolean
        if (condition) conditions.push(condition)
        return chain
      },
      orderBy: (...args: unknown[]) => {
        const order = args[0] as (a: SeedBook, b: SeedBook) => number
        if (order) sortFn = order
        return chain
      },
      limit: async (n: number) => {
        limitCount = n
        let results = [...data]
        for (const cond of conditions) {
          results = results.filter(cond)
        }
        if (sortFn) results.sort(sortFn)
        return results.slice(0, limitCount) as T[]
      },
      groupBy: async () => {
        const groups: Record<string, number> = {}
        for (const item of data) {
          groups[item.category] = (groups[item.category] || 0) + 1
        }
        return Object.entries(groups).map(([category, count]) => ({
          category,
          count,
        })) as { category: string; count: number }[]
      },
    }

    return chain
  }

  return {
    select: () => query(),
    query: () => ({
      $callback: async () => data,
    }),
    _data: data,
  }
}

export const db = createInMemoryDb()
