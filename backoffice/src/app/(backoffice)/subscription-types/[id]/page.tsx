import { notFound } from "next/navigation";

import { SubscriptionTypeForm } from "@/components/backoffice/subscription-type-form";
import { TOOL_KEYS, type ToolKey } from "@/lib/tools";
import { pool } from "@/lib/pg";

type Row = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  billing_interval: "month" | "year";
  max_properties: number;
  stripe_price_id: string | null;
  tools_included: string[];
  sort_order: number;
  is_active: boolean;
};

export default async function EditSubscriptionTypePage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const result = await pool.query<Row>(
    `
    SELECT
      id,
      name,
      description,
      price_cents,
      billing_interval,
      max_properties,
      stripe_price_id,
      tools_included,
      sort_order,
      is_active
    FROM subscription_types
    WHERE id = $1
    `,
    [id]
  );

  const row = result.rows[0];

  if (!row) {
    notFound();
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-muted-foreground">Catalog</p>
        <h2 className="text-2xl font-semibold">Edit Subscription Type</h2>
      </div>
      <SubscriptionTypeForm
        initialData={{
          id: row.id,
          name: row.name,
          description: row.description ?? "",
          priceCents: row.price_cents,
          billingInterval: row.billing_interval,
          maxProperties: row.max_properties,
          stripePriceId: row.stripe_price_id ?? "",
          toolsIncluded: row.tools_included.filter((tool): tool is ToolKey =>
            TOOL_KEYS.includes(tool as ToolKey)
          ),
          sortOrder: row.sort_order,
          isActive: row.is_active
        }}
      />
    </div>
  );
}
