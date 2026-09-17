import { LoginForm } from '@/components/auth/login-form'

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams
  const redirect = first(params.redirect)
  const error = first(params.error)

  return (
    <LoginForm
      initialRedirect={redirect || '/books'}
      initialError={error}
    />
  )
}
