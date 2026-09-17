import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireMasterAdmin } from '@/lib/auth'
import { listDeletedArchivesForCompliance } from '@/lib/compliance'

export const dynamic = 'force-dynamic'

export default async function DeletedUsersPage() {
  let admin
  try {
    admin = await requireMasterAdmin()
  } catch {
    redirect('/login?next=/admin/deleted-users')
  }

  let rows = [] as Awaited<ReturnType<typeof listDeletedArchivesForCompliance>>
  try {
    rows = await listDeletedArchivesForCompliance(admin)
  } catch (err) {
    console.error('[admin/deleted-users/page] archive list failed', err)
  }

  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="text-3xl font-semibold">Deleted User Archive</h1>
      <p className="mt-2 text-sm opacity-70">
        Restricted Master Admin compliance records. Expired records are purged when they are not under legal hold. Sensitive purchase details require a documented review reason and every access is audited.
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
              <th className="p-2">Review</th>
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
                <td className="p-2">
                  <Link
                    className="font-medium text-primary underline-offset-4 hover:underline"
                    href={`/admin/deleted-users/${row.id}`}
                  >
                    Review
                  </Link>
                </td>
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
