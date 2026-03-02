"use client";

import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

type ToolItem = {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
  available: boolean;
};

type ToolsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string | null;
  propertyDomain: string | null;
};

export function ToolsDialog({
  open,
  onOpenChange,
  propertyId,
  propertyDomain
}: ToolsDialogProps) {
  const [tools, setTools] = useState<ToolItem[]>([]);
  const [initialTools, setInitialTools] = useState<ToolItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!open || !propertyId) {
        return;
      }

      setLoading(true);
      setError(null);

      const response = await fetch(`/api/properties/${propertyId}/tools`, { cache: "no-store" });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setError(data?.message ?? "Failed to load tools.");
        setLoading(false);
        return;
      }

      setTools(data.tools ?? []);
      setInitialTools(data.tools ?? []);
      setLoading(false);
    };

    void load();
  }, [open, propertyId]);

  const hasChanges = useMemo(() => {
    if (tools.length !== initialTools.length) {
      return true;
    }

    return tools.some((tool, index) => tool.enabled !== initialTools[index]?.enabled);
  }, [initialTools, tools]);

  const toggleTool = (key: string, checked: boolean) => {
    setTools((current) =>
      current.map((tool) => (tool.key === key ? { ...tool, enabled: checked } : tool))
    );
  };

  const onSave = async () => {
    if (!propertyId) {
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      tools: Object.fromEntries(tools.map((tool) => [tool.key, tool.enabled]))
    };

    const response = await fetch(`/api/properties/${propertyId}/tools`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      setSaving(false);
      setError(data?.message ?? "Failed to save tool settings.");
      return;
    }

    setTools(data.tools ?? tools);
    setInitialTools(data.tools ?? tools);
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tools for {propertyDomain ?? "property"}</DialogTitle>
          <DialogDescription>Enable the toolset for this property.</DialogDescription>
        </DialogHeader>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading tools...</p>
        ) : (
          <div className="space-y-3">
            {tools.map((tool) => (
              <div key={tool.key} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{tool.label}</p>
                      {!tool.available ? <Badge variant="destructive">Upgrade required</Badge> : null}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{tool.description}</p>
                  </div>
                  <Switch
                    checked={tool.enabled}
                    disabled={!tool.available}
                    onCheckedChange={(checked) => toggleTool(tool.key, checked)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button disabled={saving || !hasChanges} onClick={onSave}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
