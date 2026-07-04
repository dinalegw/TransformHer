import Courier from '@trycourier/courier'

const client = new Courier({ apiKey: process.env.COURIER_API_KEY })

const TEMPLATES = {
  passwordReset: process.env.COURIER_TEMPLATE_PASSWORD_RESET!,
  orderConfirmation: process.env.COURIER_TEMPLATE_ORDER_CONFIRMATION!,
  adminOrder: process.env.COURIER_TEMPLATE_ADMIN_ORDER!,
}

export async function sendPasswordResetEmail(to: string, resetLink: string) {
  await client.send.message({
    message: {
      to: { email: to },
      template: TEMPLATES.passwordReset,
      data: { resetLink },
    },
  })
}

export async function sendOrderConfirmation(
  to: string,
  bookTitle: string,
  amount: string,
) {
  await client.send.message({
    message: {
      to: { email: to },
      template: TEMPLATES.orderConfirmation,
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
  await client.send.message({
    message: {
      to: { email: adminEmail },
      template: TEMPLATES.adminOrder,
      data: { bookTitle, customerName, customerEmail, amount },
    },
  })
}
