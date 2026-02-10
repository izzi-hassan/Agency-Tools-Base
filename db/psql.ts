import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";

import { Client } from "pg";

async function loadDatabaseUrl(): Promise<string | undefined> {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  for (const filename of [".env.local", ".env", ".env.example"]) {
    const filePath = path.join(process.cwd(), filename);
    try {
      const content = await fs.readFile(filePath, "utf8");
      const match = content.match(/^DATABASE_URL=(.+)$/m);
      if (match?.[1]) {
        return match[1].trim();
      }
    } catch {
      continue;
    }
  }

  return undefined;
}

async function main() {
  const databaseUrl = await loadDatabaseUrl();

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required.");
  }

  const args = process.argv.slice(2);
  const normalizedArgs = args[0] === "--" ? args.slice(1) : args;
  const sql = normalizedArgs.join(" ").trim();

  if (!sql) {
    console.log("Usage: pnpm db:psql -- \"SELECT now();\"");
    return;
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    const result = await client.query(sql);
    if (result.rows.length === 0) {
      console.log("OK");
      return;
    }

    console.table(result.rows);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Query failed: ${message}`);
  process.exit(1);
});
