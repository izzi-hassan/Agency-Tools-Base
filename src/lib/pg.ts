import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var pgPool: Pool | undefined;
}

let cachedPool: Pool | undefined = globalThis.pgPool;

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
    globalThis.pgPool = cachedPool;
  }

  return cachedPool;
}

// Defer pool initialization until first actual DB operation.
export const pool = new Proxy({} as Pool, {
  get(_target, prop, receiver) {
    const value = Reflect.get(getPool(), prop, receiver);
    if (typeof value === "function") {
      return value.bind(getPool());
    }
    return value;
  }
});
