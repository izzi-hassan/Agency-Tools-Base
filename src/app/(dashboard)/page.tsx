"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { useOrganization } from "@clerk/nextjs";

const stats = [
  { label: "Properties", value: "24", delta: "+4" },
  { label: "Team Members", value: "12", delta: "+2" },
  { label: "Plan", value: "Growth", delta: "Monthly" }
];

const activity = [
  {
    title: "Property onboarding",
    description: "Maple Street Apartments added",
    status: "In review"
  },
  {
    title: "Lease renewal",
    description: "Sunset Villas - Unit 12B",
    status: "Approved"
  },
  {
    title: "Team invite",
    description: "Jordan Lee joined Operations",
    status: "Completed"
  }
];

export default function DashboardPage() {
  const { organization, isLoaded } = useOrganization();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-muted-foreground">Dashboard</p>
        <h2 className="text-2xl font-semibold">Account Overview</h2>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Active organization</CardDescription>
          <CardTitle className="text-2xl">
            {!isLoaded ? "Loading organization..." : organization?.name ?? "No active organization"}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Org ID:</span>{" "}
          {!isLoaded ? "Loading..." : organization?.id ?? "Not available"}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardDescription>{stat.label}</CardDescription>
              <CardTitle className="text-3xl">{stat.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="secondary">{stat.delta}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>What is happening across your properties.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {activity.map((item) => (
            <div
              key={item.title}
              className="flex flex-col gap-1 rounded-md border bg-muted/30 p-4"
            >
              <div className="flex items-center justify-between">
                <p className="font-medium">{item.title}</p>
                <Badge variant="outline">{item.status}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
