import Link from "next/link";

import {
  deleteAnnouncementAction,
  saveAnnouncementAction,
} from "@/app/admin/actions";
import { AdminShell } from "@/components/admin/admin-shell";
import { SiteHeader } from "@/components/shell/site-header";
import { requireAdminUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { getAdminAnnouncementsPageData } from "@/lib/orders";

export const dynamic = "force-dynamic";

export default async function AdminAnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const user = await requireAdminUser();
  const { edit } = await searchParams;
  const data = await getAdminAnnouncementsPageData(edit);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto grid w-full max-w-7xl flex-1 gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[280px_1fr] lg:px-8">
        <AdminShell user={user} pathname="/admin/announcements" />
        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <form action={saveAnnouncementAction} className="glass-panel rounded-[2rem] border border-[var(--line)] p-6">
            <input type="hidden" name="id" value={data.editingAnnouncement?.id || ""} />
            <div className="mb-4">
              <div className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
                Announcement
              </div>
              <h1 className="section-title text-4xl font-semibold">
                {data.editingAnnouncement ? "编辑公告" : "新建公告"}
              </h1>
            </div>
            <div className="space-y-3">
              <input className="field" name="title" placeholder="公告标题" defaultValue={data.editingAnnouncement?.title} />
              <textarea className="field min-h-40" name="body" placeholder="公告正文" defaultValue={data.editingAnnouncement?.body} />
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-[rgba(255,255,255,0.58)] px-4 py-3 text-sm">
                  <input type="checkbox" name="isActive" defaultChecked={data.editingAnnouncement?.isActive ?? true} />
                  启用
                </label>
                <label className="flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-[rgba(255,255,255,0.58)] px-4 py-3 text-sm">
                  <input type="checkbox" name="pinned" defaultChecked={data.editingAnnouncement?.pinned ?? false} />
                  置顶
                </label>
              </div>
              <button className="btn-primary w-full px-5 py-3 text-sm font-medium">
                保存公告
              </button>
            </div>
          </form>

          <section className="glass-panel rounded-[2rem] border border-[var(--line)] p-6">
            <h2 className="section-title text-3xl font-semibold">已发布公告</h2>
            <div className="mt-4 space-y-3">
              {data.announcements.map((announcement) => (
                <div
                  key={announcement.id}
                  className="rounded-[1.5rem] border border-[var(--line)] bg-[rgba(255,255,255,0.58)] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{announcement.title}</div>
                      <div className="mt-1 text-sm text-[var(--muted)]">
                        {formatDateTime(announcement.createdAt)}
                      </div>
                      <p className="mt-2 line-clamp-3 text-sm leading-7 text-[var(--muted)]">
                        {announcement.body}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/admin/announcements?edit=${announcement.id}`} className="btn-secondary px-3 py-2 text-sm">
                        编辑
                      </Link>
                      <form action={deleteAnnouncementAction}>
                        <input type="hidden" name="id" value={announcement.id} />
                        <button className="rounded-full border border-[rgba(182,60,49,0.18)] px-3 py-2 text-sm text-[var(--danger)]">
                          删除
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </section>
      </main>
    </>
  );
}
