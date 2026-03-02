import { SubscriptionTypeForm } from "@/components/backoffice/subscription-type-form";

export default function NewSubscriptionTypePage() {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-muted-foreground">Catalog</p>
        <h2 className="text-2xl font-semibold">New Subscription Type</h2>
      </div>
      <SubscriptionTypeForm />
    </div>
  );
}
