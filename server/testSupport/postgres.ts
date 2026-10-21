import { PGlite } from '@electric-sql/pglite';
import { neonConfig } from '@neondatabase/serverless';

/** Real, isolated PostgreSQL engine behind the same HTTP transport as Neon. */
export async function createTestDatabase() {
  process.env.DATABASE_URL = 'postgresql://test:test@example.invalid/test';
  const database = new PGlite();
  await database.waitReady;
  neonConfig.fetchFunction = async (_url: unknown, init: RequestInit) => {
    const body = JSON.parse(String(init.body));
    const query = async (input: { query: string; params: unknown[] }, executor: Pick<PGlite, 'query'> = database) => {
      // gen_random_uuid is built into PostgreSQL; PGlite does not need pgcrypto.
      const result = input.query.includes('CREATE EXTENSION IF NOT EXISTS pgcrypto')
        ? { fields: [], rows: [], affectedRows: 0 }
        : await executor.query<Record<string, unknown>>(input.query, input.params);
      return {
        fields: result.fields.map((field) => ({ name: field.name, dataTypeID: field.dataTypeID })),
        rows: result.rows.map((row) => result.fields.map((field) => {
          const value = row[field.name];
          if (value === null) return null;
          if (value instanceof Date) return field.dataTypeID === 1082 ? value.toISOString().slice(0, 10)
            : value.toISOString().replace('T', ' ').replace('Z', '+00');
          return typeof value === 'object' ? JSON.stringify(value) : String(value);
        })),
        rowCount: result.affectedRows || result.rows.length,
        command: 'SELECT',
      };
    };
    try {
      const result = body.queries ? await database.transaction(async (transaction) => {
        const results = [];
        for (const input of body.queries) results.push(await query(input, transaction));
        return { results };
      }) : await query(body);
      return new Response(JSON.stringify(result));
    } catch (error) {
      const failure = error as Error & { code?: string };
      return new Response(JSON.stringify({ message: failure.message, code: failure.code }), { status: 400 });
    }
  };
  const { initializeDatabase } = await import('../db');
  await initializeDatabase();
  return database;
}
