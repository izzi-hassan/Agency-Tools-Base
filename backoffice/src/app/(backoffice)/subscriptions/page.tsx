import { pool } from "@/lib/pg";

type Row = {
  org_id: string;
  org_name: string | null;
  plan: string;
  status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
  subscription_type_name: string | null;
};

export default async function SubscriptionsPage() {
  const result = await pool.query<Row>(
    `
    SELECT
      s.org_id,
      o.name AS org_name,
      s.plan,
      s.status,
      s.stripe_customer_id,
      s.stripe_subscription_id,
      s.current_period_end,
      st.name AS subscription_type_name
    FROM subscriptions s
    JOIN organizations o ON o.id = s.org_id
    LEFT JOIN subscription_types st ON st.id = s.subscription_type_id
    ORDER BY o.created_at DESC
    `
  );

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-muted-foreground">Billing Ops</p>
        <h2 className="text-2xl font-semibold">Subscriptions</h2>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-muted/30">
            <tr>
              <th className="px-3 py-2">Organization</th>
              <th className="px-3 py-2">Plan</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Stripe Customer</th>
              <th className="px-3 py-2">Stripe Subscription</th>
              <th className="px-3 py-2">Renewal</th>
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row) => (
              <tr key={row.org_id} className="border-b">
                <td className="px-3 py-2 font-medium">{row.org_name ?? row.org_id}</td>
                <td className="px-3 py-2">{row.subscription_type_name ?? row.plan}</td>
                <td className="px-3 py-2">{row.status}</td>
                <td className="px-3 py-2">{row.stripe_customer_id ?? "-"}</td>
                <td className="px-3 py-2">{row.stripe_subscription_id ?? "-"}</td>
                <td className="px-3 py-2">
                  {row.current_period_end
                    ? new Date(row.current_period_end).toLocaleDateString()
                    : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
