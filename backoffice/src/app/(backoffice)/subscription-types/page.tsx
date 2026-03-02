import Link from "next/link";

import { Button } from "@/components/ui/button";
import { pool } from "@/lib/pg";

type Row = {
  id: string;
  name: string;
  price_cents: number;
  billing_interval: string;
  max_properties: number;
  is_active: boolean;
  sort_order: number;
};

export default async function SubscriptionTypesPage() {
  const result = await pool.query<Row>(
    `
    SELECT id, name, price_cents, billing_interval, max_properties, is_active, sort_order
    FROM subscription_types
    ORDER BY sort_order ASC, price_cents ASC
    `
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Catalog</p>
          <h2 className="text-2xl font-semibold">Subscription Types</h2>
        </div>
        <Button asChild>
          <Link href="/subscription-types/new">New Subscription Type</Link>
        </Button>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-muted/30">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Price</th>
              <th className="px-3 py-2">Max properties</th>
              <th className="px-3 py-2">Active</th>
              <th className="px-3 py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row) => (
              <tr key={row.id} className="border-b">
                <td className="px-3 py-2 font-medium">{row.name}</td>
                <td className="px-3 py-2">
                  ${ (row.price_cents / 100).toFixed(2) }/{row.billing_interval}
                </td>
                <td className="px-3 py-2">{row.max_properties}</td>
                <td className="px-3 py-2">{row.is_active ? "Yes" : "No"}</td>
                <td className="px-3 py-2 text-right">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/subscription-types/${row.id}`}>Edit</Link>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
