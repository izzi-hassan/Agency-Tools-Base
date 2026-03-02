import { redirect } from "next/navigation";

import { ManageBillingButton } from "@/components/billing/manage-billing-button";
import { PlanCard } from "@/components/billing/plan-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getOrCreateOrgContext } from "@/lib/org-context";
import { pool } from "@/lib/pg";

type BillingPageProps = {
  searchParams?: Promise<{ success?: string; canceled?: string }>;
};

type CurrentPlanRow = {
  plan: string;
  status: string;
  stripe_customer_id: string | null;
  current_period_end: string | null;
  type_name: string | null;
  type_description: string | null;
  type_price_cents: number | null;
  type_billing_interval: "month" | "year" | null;
  type_max_properties: number | null;
  type_tools_included: string[] | null;
};

type SubscriptionTypeRow = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  billing_interval: "month" | "year";
  max_properties: number;
  stripe_price_id: string | null;
  tools_included: string[];
};

function formatRenewalDate(value: string | null): string {
  if (!value) {
    return "No renewal date available";
  }

  return new Date(value).toLocaleDateString();
}

function planSummary(row: CurrentPlanRow | undefined) {
  if (!row) {
    return { name: "Unknown", description: "No subscription found." };
  }

  return {
    name: row.type_name ?? row.plan,
    description: row.type_description ?? "Subscription details are available after setup."
  };
}

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const org = await getOrCreateOrgContext();
  if (!org) {
    redirect("/select-org");
  }

  const params = searchParams ? await searchParams : {};

  const [currentResult, typesResult] = await Promise.all([
    pool.query<CurrentPlanRow>(
      `
      SELECT
        s.plan,
        s.status,
        s.stripe_customer_id,
        s.current_period_end,
        st.name AS type_name,
        st.description AS type_description,
        st.price_cents AS type_price_cents,
        st.billing_interval AS type_billing_interval,
        st.max_properties AS type_max_properties,
        st.tools_included AS type_tools_included
      FROM subscriptions s
      LEFT JOIN subscription_types st ON st.id = s.subscription_type_id
      WHERE s.org_id = $1
      LIMIT 1
      `,
      [org.orgId]
    ),
    pool.query<SubscriptionTypeRow>(
      `
      SELECT
        id,
        name,
        description,
        price_cents,
        billing_interval,
        max_properties,
        stripe_price_id,
        tools_included
      FROM subscription_types
      WHERE is_active = TRUE
      ORDER BY sort_order ASC, price_cents ASC
      `
    )
  ]);

  const current = currentResult.rows[0];
  const summary = planSummary(current);
  const currentName = current?.type_name ?? null;
  const currentStatus = current?.status ?? "ACTIVE";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-muted-foreground">Subscription</p>
        <h2 className="text-2xl font-semibold">Billing</h2>
      </div>

      {params.success === "1" ? (
        <p className="text-sm text-green-600">Checkout completed successfully.</p>
      ) : null}
      {params.canceled === "1" ? (
        <p className="text-sm text-amber-600">Checkout was canceled.</p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>{summary.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-3xl font-semibold">{summary.name}</p>
            <Badge
              variant={
                currentStatus === "ACTIVE"
                  ? "secondary"
                  : currentStatus === "PAST_DUE"
                    ? "destructive"
                    : "outline"
              }
            >
              {currentStatus}
            </Badge>
          </div>

          <p className="text-sm text-muted-foreground">
            Renews: {formatRenewalDate(current?.current_period_end ?? null)}
          </p>

          <p className="text-sm text-muted-foreground">
            Max properties: {current?.type_max_properties ?? 1}
          </p>

          <div>
            <p className="text-sm font-medium">Enabled tools</p>
            <ul className="mt-1 list-inside list-disc text-sm text-muted-foreground">
              {(current?.type_tools_included ?? ["uptime_monitor", "event_logging"]).map((tool) => (
                <li key={tool}>{tool.replaceAll("_", " ")}</li>
              ))}
            </ul>
          </div>

          <ManageBillingButton disabled={!current?.stripe_customer_id} />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {typesResult.rows.map((plan) => (
          <PlanCard
            key={plan.id}
            billingInterval={plan.billing_interval}
            description={plan.description}
            id={plan.id}
            isCurrent={currentName === plan.name}
            maxProperties={plan.max_properties}
            name={plan.name}
            priceCents={plan.price_cents}
            stripePriceId={plan.stripe_price_id}
            toolsIncluded={plan.tools_included}
          />
        ))}
      </div>
    </div>
  );
}
