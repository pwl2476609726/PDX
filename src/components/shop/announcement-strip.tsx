type Announcement = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
};

export function AnnouncementStrip({
  announcements,
}: {
  announcements: Announcement[];
}) {
  if (announcements.length === 0) {
    return null;
  }

  return (
    <section className="fade-in glass-panel rounded-[2rem] border border-[var(--line)] p-5">
      <div className="mb-3 flex items-center gap-3">
        <span className="rounded-full bg-[rgba(143,48,40,0.12)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--primary)]">
          公告
        </span>
        <span className="text-sm text-[var(--muted)]">
          首屏展示当前启用中的店铺通知与发货提醒
        </span>
      </div>
      <div className="grid gap-3">
        {announcements.map((announcement, index) => (
          <article
            key={announcement.id}
            className="rounded-2xl border border-[var(--line)] bg-[rgba(255,255,255,0.55)] p-4"
            style={{ animationDelay: `${index * 80}ms` }}
          >
            <div className="mb-2 flex items-center gap-2">
              {announcement.pinned ? (
                <span className="rounded-full bg-[rgba(209,168,107,0.24)] px-2 py-1 text-[11px] font-medium text-[var(--warning)]">
                  置顶
                </span>
              ) : null}
              <h3 className="font-medium">{announcement.title}</h3>
            </div>
            <p className="text-sm leading-7 text-[var(--muted)]">{announcement.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
