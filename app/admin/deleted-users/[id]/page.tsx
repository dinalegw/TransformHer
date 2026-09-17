import { redirect } from 'next/navigation'
import { requireMasterAdmin } from '@/lib/auth'
import { DeletedUserReviewClient } from './review-client'

export const dynamic = 'force-dynamic'

export default async function DeletedUserReviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  try {
    await requireMasterAdmin()
  } catch {
    redirect('/login?next=/admin/deleted-users')
  }

  const { id } = await params

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="text-3xl font-semibold">Compliance Record Review</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Enter a documented purpose before opening retained details. Access and legal-hold changes are written to the compliance audit trail.
      </p>
      <DeletedUserReviewClient archiveId={id} />
    </main>
  )
}
