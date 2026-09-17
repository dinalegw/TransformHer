import { redirect } from 'next/navigation'
import { desc } from 'drizzle-orm'
import { requireMasterAdmin } from '@/lib/auth'
import { getDb } from '@/lib/db/connection'
import { deletedUserArchives } from '@/lib/db/schema'

export const dynamic = 'force-dynamic'

export default async function DeletedUsersPage() {
  try {
    await requireMasterAdmin()
  } catch {
    redirect('/login?next=/admin/deleted-users')
  }

  const db = await getDb()
  const rows = db
    ? await db.select().from(deletedUserArchives)
      .orderBy(desc(deletedUserArchives.accountDeletedAt))
      .limit(100)
    : []

  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="text-3xl font-semibold">Deleted User Archive</h1>
      <p className="mt-2 text-sm opacity-70">
        Restricted Master Admin compliance records. Records are retained only for the stated retention purpose and may be placed on legal hold for a documented lawful request.
      </p>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              <th className="p-2">User</th>
              <th className="p-2">Email</th>
              <th className="p-2">Deleted</th>
              <th className="p-2">Method</th>
              <th className="p-2">Reason</th>
              <th className="p-2">Retention</th>
              <th className="p-2">Legal hold</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="p-2">{row.originalName}</td>
                <td className="p-2">{row.originalEmail}</td>
                <td className="p-2">{row.accountDeletedAt.toLocaleString()}</td>
                <td className="p-2">{row.deletionType}</td>
                <td className="p-2">{row.deletionReason || '—'}</td>
                <td className="p-2">{row.retentionExpiresAt.toLocaleDateString()}</td>
                <td className="p-2">{row.legalHold ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="py-8 text-center opacity-60">No deleted accounts archived.</p>
        )}
      </div>
    </main>
  )
}
