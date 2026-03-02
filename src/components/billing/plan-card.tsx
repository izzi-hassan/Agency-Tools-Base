"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type PlanCardProps = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  billingInterval: "month" | "year";
  maxProperties: number;
  toolsIncluded: string[];
  stripePriceId: string | null;
  isCurrent: boolean;
};

function formatPrice(priceCents: number, billingInterval: "month" | "year"): string {
  if (priceCents === 0) {
    return "Free";
  }

  return `$${(priceCents / 100).toFixed(2)}/${billingInterval}`;
}

export function PlanCard(props: PlanCardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubscribe = async () => {
    setLoading(true);
    setError(null);

    const response = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscriptionTypeId: props.id })
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || !data?.url) {
      setLoading(false);
      setError(data?.message ?? "Failed to start checkout.");
      return;
    }

    window.location.href = data.url;
  };

  return (
    <Card className={cn(props.isCurrent && "ring-2 ring-primary") }>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{props.name}</CardTitle>
          {props.isCurrent ? <Badge>Current</Badge> : null}
        </div>
        <CardDescription>{props.description ?? "No description provided."}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-2xl font-semibold">{formatPrice(props.priceCents, props.billingInterval)}</p>
          <p className="text-sm text-muted-foreground">Up to {props.maxProperties} properties</p>
        </div>

        <div>
          <p className="text-sm font-medium">Included tools</p>
          <ul className="mt-1 list-inside list-disc text-sm text-muted-foreground">
            {props.toolsIncluded.map((tool) => (
              <li key={tool}>{tool.replaceAll("_", " ")}</li>
            ))}
          </ul>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Button
          className="w-full"
          disabled={loading || props.isCurrent || !props.stripePriceId}
          onClick={onSubscribe}
          variant={props.isCurrent ? "secondary" : "default"}
        >
          {props.isCurrent ? "Current Plan" : loading ? "Redirecting..." : "Choose Plan"}
        </Button>

        {!props.stripePriceId ? (
          <p className="text-xs text-muted-foreground">Stripe price not configured yet for this plan.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
