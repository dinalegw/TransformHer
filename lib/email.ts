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
  if (!val) {
    throw new Error(`${key} environment variable is required`)
  }
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

export async function sendOrderConfirmation(
  to: string,
  bookTitle: string,
  amount: string,
) {
  const client = getClient()
  await client.send.message({
    message: {
      to: { email: to },
      template: getTemplate('COURIER_TEMPLATE_ORDER_CONFIRMATION'),
      data: { bookTitle, amount },
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
