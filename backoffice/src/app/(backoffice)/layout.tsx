import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

import { requireBackofficeAuth } from "@/lib/auth";

const navItems = [
  { href: "/subscriptions", label: "Subscriptions" },
  { href: "/subscription-types", label: "Subscription Types" }
];

export default async function BackofficeLayout({ children }: { children: React.ReactNode }) {
  await requireBackofficeAuth();

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-sm text-muted-foreground">ShinyMetal Admin</p>
            <h1 className="text-lg font-semibold">Backoffice</h1>
          </div>
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-6 py-6 md:grid-cols-[220px_1fr]">
        <nav className="flex flex-col gap-1 rounded-lg border bg-background p-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm hover:bg-muted"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <main className="rounded-lg border bg-background p-6">{children}</main>
      </div>
    </div>
  );
}
