import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

/**
 * One data layer, two drivers.
 *
 * With DATABASE_URL set, this is node-postgres against a real Postgres, exactly
 * as CONTRACT.md describes. Without it, the same SQL runs against PGlite — a
 * full Postgres compiled to WASM, in-process, no daemon — so the schema's CHECK
 * constraints and guarded UPDATEs behave identically on a machine with no
 * database installed. Only the env var changes between the two.
 */

export interface QueryResult<T> {
  rows: T[]
  rowCount: number
}

export interface Queryable {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<QueryResult<T>>
}

export interface Db extends Queryable {
  /** Runs fn inside a transaction, rolling back if it throws. */
  tx<T>(fn: (q: Queryable) => Promise<T>): Promise<T>
  /**
   * Runs a multi-statement script. Separate from query() because the extended
   * protocol only accepts one statement at a time — a parameterised query
   * cannot carry a whole schema file.
   */
  exec(sql: string): Promise<void>
  driver: 'postgres' | 'pglite'
}

/** PGlite keeps its data here so registrations survive an API restart. */
const PGLITE_DIR = fileURLToPath(new URL('../../.pglite', import.meta.url))

async function createPostgres(connectionString: string): Promise<Db> {
  const { default: pg } = await import('pg')
  const pool = new pg.Pool({ connectionString })

  const wrap = (client: { query: (t: string, p?: unknown[]) => Promise<any> }): Queryable => ({
    async query(text, params) {
      const res = await client.query(text, params)
      return { rows: res.rows, rowCount: res.rowCount ?? res.rows.length }
    },
  })

  return {
    driver: 'postgres',
    query: (text, params) => wrap(pool).query(text, params),
    async exec(sql) {
      // No parameters, so node-postgres uses the simple protocol, which allows
      // several statements in one round trip.
      await pool.query(sql)
    },
    async tx(fn) {
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        const result = await fn(wrap(client))
        await client.query('COMMIT')
        return result
      } catch (err) {
        await client.query('ROLLBACK')
        throw err
      } finally {
        client.release()
      }
    },
  }
}

async function createPglite(): Promise<Db> {
  const { PGlite } = await import('@electric-sql/pglite')
  const lite = new PGlite(PGLITE_DIR)
  await lite.waitReady

  // PGlite reports affectedRows for writes and rows for reads; taking the larger
  // of the two gives one rowCount that is correct for SELECT, UPDATE, and
  // UPDATE ... RETURNING alike.
  const wrap = (client: { query: (t: string, p?: unknown[]) => Promise<any> }): Queryable => ({
    async query(text, params) {
      const res = await client.query(text, params)
      return { rows: res.rows, rowCount: Math.max(res.rows.length, res.affectedRows ?? 0) }
    },
  })

  return {
    driver: 'pglite',
    query: (text, params) => wrap(lite).query(text, params),
    exec: async (sql) => {
      await lite.exec(sql)
    },
    tx: (fn) => lite.transaction((tx: any) => fn(wrap(tx))) as Promise<any>,
  }
}

let dbPromise: Promise<Db> | null = null

export function getDb(): Promise<Db> {
  dbPromise ??= process.env.DATABASE_URL
    ? createPostgres(process.env.DATABASE_URL)
    : createPglite()
  return dbPromise
}

/**
 * Applies schema.sql then seed.sql. Both are idempotent, so a restart always
 * leaves the database matching the code.
 */
export async function initDb(): Promise<Db> {
  const db = await getDb()
  for (const file of ['schema.sql', 'seed.sql']) {
    const sql = await readFile(fileURLToPath(new URL(`./${file}`, import.meta.url)), 'utf8')
    await db.exec(sql)
  }
  return db
}
