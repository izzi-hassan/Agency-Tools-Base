"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

type ManageBillingButtonProps = {
  disabled?: boolean;
};

export function ManageBillingButton({ disabled }: ManageBillingButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onClick = async () => {
    setLoading(true);
    setError(null);

    const response = await fetch("/api/billing/portal", { method: "POST" });
    const data = await response.json().catch(() => null);

    if (!response.ok || !data?.url) {
      setLoading(false);
      setError(data?.message ?? "Failed to open billing portal.");
      return;
    }

    window.location.href = data.url;
  };

  return (
    <div className="space-y-2">
      <Button disabled={disabled || loading} onClick={onClick} variant="outline">
        {loading ? "Opening..." : "Manage Billing"}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
