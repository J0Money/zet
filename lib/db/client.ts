// Postgres-klient (node-postgres) til appen, scripts og tests. Uden "server-only",
// så scripts uden for Next.js også kan bruge den.
import { Pool } from "pg";

export type Statement = { text: string; params: unknown[] };

export const statement = (text: string, params: unknown[] = []): Statement => ({ text, params });

export type SqlClient = {
  pool: Pool;
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
  // Skabelon-skrivemåde til scripts og tests: sql`select ... where id = ${id}`. Værdier sendes som parametre.
  sql<T = Record<string, unknown>>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T[]>;
  // Kører sætningerne i rækkefølge i ÉN transaktion og returnerer rækkerne fra hver.
  // Fejler én, rulles alle tilbage.
  transaction(statements: Statement[], options?: { isolationLevel?: "Serializable" }): Promise<unknown[][]>;
};

export function createSqlClient(connectionString: string): SqlClient {
  const pool = new Pool({ connectionString, max: 10 });
  const query = async (text: string, params: unknown[] = []) => (await pool.query(text, params)).rows;
  return {
    pool,
    query,
    sql(strings, ...values) {
      return query(strings.reduce((text, part, index) => `${text}$${index}${part}`), values);
    },
    async transaction(statements, options) {
      const client = await pool.connect();
      try {
        await client.query(options?.isolationLevel === "Serializable" ? "BEGIN ISOLATION LEVEL SERIALIZABLE" : "BEGIN");
        const results: unknown[][] = [];
        for (const { text, params } of statements) results.push((await client.query(text, params)).rows);
        await client.query("COMMIT");
        client.release();
        return results;
      } catch (error) {
        // En forbindelse, der ikke kan rulles tilbage, må ikke gå tilbage i puljen.
        try {
          await client.query("ROLLBACK");
          client.release();
        } catch (rollbackError) {
          client.release(rollbackError as Error);
        }
        throw error;
      }
    },
  };
}
