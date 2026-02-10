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

  const migrationsDir = path.join(process.cwd(), "db", "migrations");
  const entries = await fs.readdir(migrationsDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  if (files.length === 0) {
    console.log("No migrations found.");
    return;
  }

  const client = new Client({ connectionString: databaseUrl });

  await client.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const applied = await client.query<{ filename: string }>(
      "SELECT filename FROM schema_migrations"
    );
    const appliedSet = new Set(applied.rows.map((row: { filename: string }) => row.filename));

    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`Skipping ${file} (already applied)`);
        continue;
      }

      const sql = await fs.readFile(path.join(migrationsDir, file), "utf8");
      console.log(`Applying ${file}...`);

      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }

    console.log("Migrations complete.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Migration failed: ${message}`);
  process.exit(1);
});
