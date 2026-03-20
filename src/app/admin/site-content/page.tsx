import { notFound } from "next/navigation";

import { SiteContentEditor } from "@/components/admin/site-content-editor";
import { AdminShell } from "@/components/admin/admin-shell";
import { SiteHeader } from "@/components/shell/site-header";
import { readStoreConfig } from "@/lib/site-content";

export const dynamic = "force-dynamic";

export default async function SiteContentPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  const config = await readStoreConfig();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto grid w-full max-w-7xl flex-1 gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[280px_1fr] lg:px-8">
        <AdminShell user={null} pathname="/admin/site-content" />
        <SiteContentEditor initialConfig={config} />
      </main>
    </>
  );
}
