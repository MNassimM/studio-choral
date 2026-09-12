import { notFound } from "next/navigation";

import { getCurrentAdmin } from "@/lib/admin/authorization";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getCurrentAdmin();
  if (!admin) notFound();

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8">
      <header className="flex items-baseline justify-between border-b border-border pb-4">
        <span className="text-sm text-muted-foreground">Administration</span>
        <span className="text-sm text-muted-foreground">{admin.email}</span>
      </header>
      {children}
    </div>
  );
}
