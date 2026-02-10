"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";

type Property = {
  id: string;
  domain: string;
  domainAliases: string[];
  ipAddress: string | null;
  hostingProvider: string | null;
  notes: string | null;
  createdAt: string;
};

const hostingProviders = [
  "Cloudflare",
  "AWS",
  "GCP",
  "Azure",
  "DigitalOcean",
  "Vercel",
  "Netlify",
  "Other"
] as const;

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resolvingIp, setResolvingIp] = useState(false);

  const [domain, setDomain] = useState("");
  const [domainAliasesInput, setDomainAliasesInput] = useState("");
  const [ipAddress, setIpAddress] = useState("");
  const [hostingProvider, setHostingProvider] = useState("");
  const [notes, setNotes] = useState("");

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [limitMessage, setLimitMessage] = useState<string | null>(null);

  const hasProperties = useMemo(() => properties.length > 0, [properties.length]);

  const loadProperties = async () => {
    setLoading(true);
    setErrorMessage(null);

    const response = await fetch("/api/properties", { cache: "no-store" });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      setErrorMessage(data?.message ?? "Failed to load properties.");
      setLoading(false);
      return;
    }

    setProperties(data.properties ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void loadProperties();
  }, []);

  const resetForm = () => {
    setDomain("");
    setDomainAliasesInput("");
    setIpAddress("");
    setHostingProvider("");
    setNotes("");
  };

  const resolveIp = async () => {
    const normalizedDomain = domain.trim().toLowerCase();
    if (!normalizedDomain) {
      setErrorMessage("Enter a domain before auto-detecting IP.");
      return;
    }

    setResolvingIp(true);
    setErrorMessage(null);

    const response = await fetch("/api/resolve-ip", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ domain: normalizedDomain })
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      setResolvingIp(false);
      setErrorMessage(data?.message ?? "Failed to resolve IP address.");
      return;
    }

    const detected = data?.ipv4?.[0] ?? "";

    if (!detected) {
      setErrorMessage("No IPv4 address found. You can still enter one manually.");
    } else {
      setIpAddress(detected);
    }

    setResolvingIp(false);
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    setLimitMessage(null);

    const domainAliases = domainAliasesInput
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);

    const response = await fetch("/api/properties", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        domain: domain.trim().toLowerCase(),
        domainAliases,
        ipAddress: ipAddress.trim() || undefined,
        hostingProvider: hostingProvider.trim() || undefined,
        notes: notes.trim() || undefined
      })
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      setSubmitting(false);
      if (data?.error === "PROPERTY_LIMIT_REACHED") {
        setLimitMessage(data?.message ?? "Property limit reached for your current plan.");
      } else {
        setErrorMessage(data?.message ?? "Failed to create property.");
      }
      return;
    }

    resetForm();
    setOpen(false);
    setSubmitting(false);
    await loadProperties();
  };

  const onDelete = async (id: string) => {
    setErrorMessage(null);

    const response = await fetch(`/api/properties/${id}`, {
      method: "DELETE"
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      setErrorMessage(data?.message ?? "Failed to delete property.");
      return;
    }

    await loadProperties();
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Portfolio</p>
          <h2 className="text-2xl font-semibold">Properties</h2>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Add Property</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Property</DialogTitle>
              <DialogDescription>
                Create a new property in your active organization.
              </DialogDescription>
            </DialogHeader>

            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="space-y-2">
                <Label htmlFor="domain">Domain</Label>
                <Input
                  id="domain"
                  value={domain}
                  onChange={(event) => setDomain(event.target.value.toLowerCase())}
                  placeholder="example.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="domainAliases">Domain aliases</Label>
                <Input
                  id="domainAliases"
                  value={domainAliasesInput}
                  onChange={(event) => setDomainAliasesInput(event.target.value)}
                  placeholder="www.example.com, app.example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ipAddress">IP address</Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    id="ipAddress"
                    value={ipAddress}
                    onChange={(event) => setIpAddress(event.target.value.trim())}
                    placeholder="203.0.113.10"
                  />
                  <Button type="button" variant="outline" onClick={resolveIp} disabled={resolvingIp}>
                    {resolvingIp ? "Detecting..." : "Auto-detect"}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hostingProvider">Hosting provider</Label>
                <select
                  id="hostingProvider"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={hostingProvider}
                  onChange={(event) => setHostingProvider(event.target.value)}
                >
                  <option value="">Select provider</option>
                  {hostingProviders.map((provider) => (
                    <option key={provider} value={provider}>
                      {provider}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <textarea
                  id="notes"
                  className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Optional notes"
                />
              </div>

              <DialogFooter>
                <Button disabled={submitting} type="submit">
                  {submitting ? "Creating..." : "Create Property"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {limitMessage ? (
        <p className="text-sm text-amber-600">
          {limitMessage} <Link className="underline" href="/billing">Go to Billing</Link>
        </p>
      ) : null}
      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Property List</CardTitle>
          <CardDescription>Manage domains and metadata for your organization.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading properties...</p>
          ) : hasProperties ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domain</TableHead>
                  <TableHead>Aliases</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Hosting</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {properties.map((property) => (
                  <TableRow key={property.id}>
                    <TableCell className="font-medium">{property.domain}</TableCell>
                    <TableCell>
                      {property.domainAliases.length > 0 ? property.domainAliases.join(", ") : "-"}
                    </TableCell>
                    <TableCell>{property.ipAddress ?? "-"}</TableCell>
                    <TableCell>{property.hostingProvider ?? "-"}</TableCell>
                    <TableCell>{new Date(property.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => void onDelete(property.id)}>
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">No properties yet. Add your first property.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
