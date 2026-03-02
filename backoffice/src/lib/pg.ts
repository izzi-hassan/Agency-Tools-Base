import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var backofficePool: Pool | undefined;
}

let cachedPool: Pool | undefined = globalThis.backofficePool;

function getPool(): Pool {
  if (cachedPool) {
    return cachedPool;
  }

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required.");
  }

  cachedPool = new Pool({
    connectionString,
    max: 10
  });

  if (process.env.NODE_ENV !== "production") {
    globalThis.backofficePool = cachedPool;
  }

  return cachedPool;
}

export const pool = new Proxy({} as Pool, {
  get(_target, prop, receiver) {
    const value = Reflect.get(getPool(), prop, receiver);
    if (typeof value === "function") {
      return value.bind(getPool());
    }
    return value;
  }
});
