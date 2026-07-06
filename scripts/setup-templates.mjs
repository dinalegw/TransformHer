import Courier from '@trycourier/courier'

const client = new Courier({ apiKey: process.env.COURIER_API_KEY })

const templateConfigs = [
  {
    name: 'Password Reset',
    tags: ['auth'],
    envKey: 'COURIER_TEMPLATE_PASSWORD_RESET',
    elements: [
      { type: 'meta', title: 'Reset your TransformHer password' },
      {
        type: 'text',
        content: 'Click the button below to reset your password. This link expires in 1 hour.',
        align: 'left',
      },
    ],
    html: `<div style="max-width:480px;margin:0 auto;font-family:sans-serif;">
  <h1 style="color:#8B5CF6;">TransformHer</h1>
  <p>You requested a password reset. Click the button below to set a new password:</p>
  <a href="{{data.resetLink}}" style="display:inline-block;padding:12px 24px;background:#8B5CF6;color:#fff;text-decoration:none;border-radius:999px;font-weight:600;">
    Reset password
  </a>
  <p style="margin-top:24px;color:#6b7280;font-size:14px;">
    This link expires in 1 hour. If you didn't request this, you can ignore this email.
  </p>
</div>`,
    subject: 'Reset your TransformHer password',
  },
  {
    name: 'Welcome & Verify Email',
    tags: ['auth'],
    envKey: 'COURIER_TEMPLATE_WELCOME_VERIFY',
    elements: [
      { type: 'meta', title: 'Welcome to TransformHer — verify your email' },
      {
        type: 'text',
        content: 'Welcome {{data.name}},',
        align: 'left',
      },
      {
        type: 'text',
        content: 'Thank you for joining TransformHer! Please verify your email address to activate your account.',
        align: 'left',
      },
    ],
    html: `<div style="max-width:480px;margin:0 auto;font-family:sans-serif;">
  <h1 style="color:#8B5CF6;">TransformHer</h1>
  <p>Welcome <strong>{{data.name}}</strong>,</p>
  <p>Thank you for joining TransformHer! Please verify your email address to activate your account and start your journey.</p>
  <a href="{{data.verifyLink}}" style="display:inline-block;padding:12px 24px;background:#8B5CF6;color:#fff;text-decoration:none;border-radius:999px;font-weight:600;margin-top:16px;">
    Verify Email Address
  </a>
  <p style="margin-top:24px;color:#6b7280;font-size:14px;">
    This link expires in 24 hours. If you didn't create an account, you can ignore this email.
  </p>
</div>`,
    subject: 'Welcome to TransformHer — verify your email',
  },
  {
    name: 'Email Verified',
    tags: ['auth'],
    envKey: 'COURIER_TEMPLATE_EMAIL_VERIFIED',
    elements: [
      { type: 'meta', title: 'Your email has been verified' },
      {
        type: 'text',
        content: 'Hi {{data.name}},',
        align: 'left',
      },
      {
        type: 'text',
        content: 'Your email address has been successfully verified. Your account is now fully activated.',
        align: 'left',
      },
    ],
    html: `<div style="max-width:480px;margin:0 auto;font-family:sans-serif;">
  <h1 style="color:#8B5CF6;">TransformHer</h1>
  <p>Hi <strong>{{data.name}}</strong>,</p>
  <p>Your email address has been successfully verified. Your account is now fully activated.</p>
  <p style="margin-top:24px;">You can now explore our library and start your transformational journey.</p>
  <a href="{{data.libraryLink}}" style="display:inline-block;padding:12px 24px;background:#8B5CF6;color:#fff;text-decoration:none;border-radius:999px;font-weight:600;margin-top:16px;">
    Browse the Library
  </a>
</div>`,
    subject: 'Your email has been verified',
  },
  {
    name: 'Order Confirmation',
    tags: ['orders'],
    envKey: 'COURIER_TEMPLATE_ORDER_CONFIRMATION',
    elements: [
      { type: 'meta', title: 'Purchase confirmed — {{data.bookTitle}}' },
      {
        type: 'text',
        content: 'Congratulations {{data.name}}!',
        align: 'left',
      },
      {
        type: 'text',
        content: 'You have successfully purchased "{{data.bookTitle}}" for {{data.amount}}.',
        align: 'left',
      },
    ],
    html: `<div style="max-width:480px;margin:0 auto;font-family:sans-serif;">
  <h1 style="color:#8B5CF6;">TransformHer</h1>
  <p>Congratulations <strong>{{data.name}}</strong>!</p>
  <p>You have successfully purchased <strong>"{{data.bookTitle}}"</strong> for <strong>{{data.amount}}</strong>.</p>
  <p style="margin-top:24px;">Your book will be unlocked and available for reading in your library within <strong>72 hours</strong>. You will receive an email once it is ready.</p>
  <p style="color:#6b7280;font-size:14px;margin-top:16px;">Thank you for your purchase! We hope this book transforms your life.</p>
</div>`,
    subject: 'Purchase confirmed — {{data.bookTitle}}',
  },
  {
    name: 'Book Released',
    tags: ['orders'],
    envKey: 'COURIER_TEMPLATE_BOOK_RELEASED',
    elements: [
      { type: 'meta', title: '{{data.bookTitle}} is now available in your library' },
      {
        type: 'text',
        content: 'Great news {{data.name}}!',
        align: 'left',
      },
      {
        type: 'text',
        content: '"{{data.bookTitle}}" has been released and is now available for you to read in your library.',
        align: 'left',
      },
    ],
    html: `<div style="max-width:480px;margin:0 auto;font-family:sans-serif;">
  <h1 style="color:#8B5CF6;">TransformHer</h1>
  <p>Great news <strong>{{data.name}}</strong>!</p>
  <p><strong>"{{data.bookTitle}}"</strong> has been released and is now available for you to read in your library.</p>
  <p style="margin-top:8px;">You have full access to read, bookmark, and highlight. Enjoy your reading journey!</p>
  <a href="{{data.libraryLink}}" style="display:inline-block;padding:12px 24px;background:#8B5CF6;color:#fff;text-decoration:none;border-radius:999px;font-weight:600;margin-top:16px;">
    Read Now
  </a>
</div>`,
    subject: '{{data.bookTitle}} is now available in your library',
  },
  {
    name: 'Admin Order Notification',
    tags: ['orders', 'admin'],
    envKey: 'COURIER_TEMPLATE_ADMIN_ORDER',
    elements: [
      { type: 'meta', title: 'New order: {{data.bookTitle}}' },
      {
        type: 'text',
        content: 'A new order has been placed:',
        align: 'left',
      },
    ],
    html: `<div style="max-width:480px;margin:0 auto;font-family:sans-serif;">
  <h1 style="color:#8B5CF6;">New Order</h1>
  <table style="width:100%;border-collapse:collapse;margin-top:16px;">
    <tr><td style="padding:8px 0;color:#6b7280;">Book</td><td style="font-weight:600;">{{data.bookTitle}}</td></tr>
    <tr><td style="padding:8px 0;color:#6b7280;">Customer</td><td>{{data.customerName}}</td></tr>
    <tr><td style="padding:8px 0;color:#6b7280;">Email</td><td>{{data.customerEmail}}</td></tr>
    <tr><td style="padding:8px 0;color:#6b7280;">Amount</td><td>{{data.amount}}</td></tr>
  </table>
</div>`,
    subject: 'New order: {{data.bookTitle}}',
  },
]

async function main() {
  console.log('Creating Courier templates...\n')

  for (const cfg of templateConfigs) {
    try {
      const result = await client.notifications.create({
        notification: {
          name: cfg.name,
          tags: cfg.tags,
          brand: null,
          routing: null,
          subscription: null,
          content: {
            version: '2022-01-01',
            elements: cfg.elements,
          },
        },
        state: 'PUBLISHED',
      })

      const templateId = result.id
      console.log(`✅ Created "${cfg.name}" — ID: ${templateId}`)

      await client.notifications.putContent(templateId, {
        content: {
          version: '2022-01-01',
          elements: [
            { type: 'meta', title: cfg.subject },
            { type: 'channel', channel: 'email', raw: { html: cfg.html } },
          ],
        },
        state: 'PUBLISHED',
      })

      console.log(`   ${cfg.envKey}=${templateId}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (message.includes('already exists') || message.includes('slug already exists')) {
        console.log(`⚠️  "${cfg.name}" already exists — skipping creation.`)
        console.log(`   Set ${cfg.envKey} manually from your Courier dashboard.\n`)
      } else {
        console.error(`❌ Failed to create "${cfg.name}": ${message}\n`)
      }
    }
  }

  console.log('\nDone! Copy the IDs above into your .env.local file.')
}

main().catch((err) => {
  console.error('Script failed:', err)
  process.exit(1)
})
