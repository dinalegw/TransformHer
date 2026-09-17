import { SignupForm } from '@/components/auth/signup-form'

type SignupPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams
  return <SignupForm initialError={first(params.error)} />
}
