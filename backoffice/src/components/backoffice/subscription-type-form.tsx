"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TOOL_KEYS, TOOL_LABELS, type ToolKey } from "@/lib/tools";

type FormData = {
  id?: string;
  name: string;
  description: string;
  priceCents: number;
  billingInterval: "month" | "year";
  maxProperties: number;
  stripePriceId: string;
  toolsIncluded: ToolKey[];
  sortOrder: number;
  isActive: boolean;
};

type SubscriptionTypeFormProps = {
  initialData?: FormData;
};

const defaultData: FormData = {
  name: "",
  description: "",
  priceCents: 0,
  billingInterval: "month",
  maxProperties: 1,
  stripePriceId: "",
  toolsIncluded: ["uptime_monitor", "event_logging"],
  sortOrder: 0,
  isActive: true
};

export function SubscriptionTypeForm({ initialData }: SubscriptionTypeFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<FormData>(initialData ?? defaultData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleTool = (tool: ToolKey) => {
    setForm((current) => {
      const exists = current.toolsIncluded.includes(tool);
      return {
        ...current,
        toolsIncluded: exists
          ? current.toolsIncluded.filter((item) => item !== tool)
          : [...current.toolsIncluded, tool]
      };
    });
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      name: form.name,
      description: form.description || null,
      priceCents: Number(form.priceCents),
      billingInterval: form.billingInterval,
      maxProperties: Number(form.maxProperties),
      stripePriceId: form.stripePriceId || null,
      toolsIncluded: form.toolsIncluded,
      sortOrder: Number(form.sortOrder),
      isActive: form.isActive
    };

    const endpoint = form.id ? `/api/subscription-types/${form.id}` : "/api/subscription-types";
    const method = form.id ? "PATCH" : "POST";

    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      setLoading(false);
      setError(data?.message ?? "Failed to save subscription type.");
      return;
    }

    router.push("/subscription-types");
    router.refresh();
  };

  const onDelete = async () => {
    if (!form.id) {
      return;
    }

    setLoading(true);
    setError(null);

    const response = await fetch(`/api/subscription-types/${form.id}`, {
      method: "DELETE"
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      setLoading(false);
      setError(data?.message ?? "Failed to delete subscription type.");
      return;
    }

    router.push("/subscription-types");
    router.refresh();
  };

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          required
          value={form.name}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          className="min-h-20 w-full rounded-md border px-3 py-2 text-sm"
          value={form.description}
          onChange={(event) =>
            setForm((current) => ({ ...current, description: event.target.value }))
          }
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="price">Price (cents)</Label>
          <Input
            id="price"
            min={0}
            required
            type="number"
            value={form.priceCents}
            onChange={(event) =>
              setForm((current) => ({ ...current, priceCents: Number(event.target.value) }))
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="interval">Billing interval</Label>
          <select
            id="interval"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={form.billingInterval}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                billingInterval: event.target.value as "month" | "year"
              }))
            }
          >
            <option value="month">Monthly</option>
            <option value="year">Yearly</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="maxProperties">Max properties</Label>
          <Input
            id="maxProperties"
            min={1}
            required
            type="number"
            value={form.maxProperties}
            onChange={(event) =>
              setForm((current) => ({ ...current, maxProperties: Number(event.target.value) }))
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sortOrder">Sort order</Label>
          <Input
            id="sortOrder"
            required
            type="number"
            value={form.sortOrder}
            onChange={(event) =>
              setForm((current) => ({ ...current, sortOrder: Number(event.target.value) }))
            }
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="stripePrice">Stripe price ID</Label>
          <Input
            id="stripePrice"
            placeholder="price_..."
            value={form.stripePriceId}
            onChange={(event) =>
              setForm((current) => ({ ...current, stripePriceId: event.target.value }))
            }
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Tools included</Label>
        <div className="grid gap-2 md:grid-cols-2">
          {TOOL_KEYS.map((tool) => (
            <label key={tool} className="flex items-center gap-2 text-sm">
              <input
                checked={form.toolsIncluded.includes(tool)}
                onChange={() => toggleTool(tool)}
                type="checkbox"
              />
              {TOOL_LABELS[tool]}
            </label>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          checked={form.isActive}
          onChange={(event) =>
            setForm((current) => ({ ...current, isActive: event.target.checked }))
          }
          type="checkbox"
        />
        Active
      </label>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex gap-2">
        <Button disabled={loading} type="submit">
          {loading ? "Saving..." : "Save"}
        </Button>

        {form.id ? (
          <Button disabled={loading} onClick={onDelete} type="button" variant="destructive">
            Delete
          </Button>
        ) : null}
      </div>
    </form>
  );
}
