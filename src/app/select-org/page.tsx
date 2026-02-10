"use client";

import { OrganizationList } from "@clerk/nextjs";

import { Card } from "@/components/ui/card";

export default function SelectOrgPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">
      <Card className="w-full max-w-2xl p-6 shadow-lg">
        <OrganizationList
          afterSelectOrganizationUrl="/"
          afterCreateOrganizationUrl="/"
        />
      </Card>
    </div>
  );
}
