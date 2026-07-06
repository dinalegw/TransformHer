import Courier from '@trycourier/courier'

let _client: Courier | null = null

function getClient() {
  if (!_client) {
    const apiKey = process.env.COURIER_API_KEY
    if (!apiKey) throw new Error('COURIER_API_KEY is required')
    _client = new Courier({ apiKey })
  }
  return _client
}

function getTemplate(key: string): string {
  const val = process.env[key]
  if (!val) throw new Error(`${key} environment variable is required`)
  return val
}

export async function sendPasswordResetEmail(to: string, resetLink: string) {
  const client = getClient()
  await client.send.message({
    message: {
      to: { email: to },
      template: getTemplate('COURIER_TEMPLATE_PASSWORD_RESET'),
      data: { resetLink },
    },
  })
}

export async function sendWelcomeVerificationEmail(to: string, name: string, verifyLink: string) {
  const client = getClient()
  await client.send.message({
    message: {
      to: { email: to },
      template: getTemplate('COURIER_TEMPLATE_WELCOME_VERIFY'),
      data: { name, verifyLink },
    },
  })
}

export async function sendEmailVerifiedEmail(to: string, name: string, libraryLink: string) {
  const client = getClient()
  await client.send.message({
    message: {
      to: { email: to },
      template: getTemplate('COURIER_TEMPLATE_EMAIL_VERIFIED'),
      data: { name, libraryLink },
    },
  })
}

export async function sendPurchaseConfirmation(
  to: string,
  name: string,
  bookTitle: string,
  amount: string,
) {
  const client = getClient()
  await client.send.message({
    message: {
      to: { email: to },
      template: getTemplate('COURIER_TEMPLATE_ORDER_CONFIRMATION'),
      data: { name, bookTitle, amount },
    },
  })
}

export async function sendBookReleasedEmail(
  to: string,
  name: string,
  bookTitle: string,
  libraryLink: string,
) {
  const client = getClient()
  await client.send.message({
    message: {
      to: { email: to },
      template: getTemplate('COURIER_TEMPLATE_BOOK_RELEASED'),
      data: { name, bookTitle, libraryLink },
    },
  })
}

export async function sendAdminOrderNotification(
  adminEmail: string,
  customerEmail: string,
  customerName: string,
  bookTitle: string,
  amount: string,
) {
  const client = getClient()
  await client.send.message({
    message: {
      to: { email: adminEmail },
      template: getTemplate('COURIER_TEMPLATE_ADMIN_ORDER'),
      data: { bookTitle, customerName, customerEmail, amount },
    },
  })
}
