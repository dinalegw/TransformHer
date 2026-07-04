import Courier from '@trycourier/courier'

const client = new Courier({ apiKey: process.env.COURIER_API_KEY })

const templateConfigs = [
  {
    name: 'Password Reset',
    tags: ['auth'],
    id: null,
      elements: [
        { type: 'meta', title: 'Reset your TransformHer password' },
        {
          type: 'text',
          content: 'Click the button below to reset your password. This link expires in 1 hour.',
          align: 'left',
        },
      ],
  },
  {
    name: 'Order Confirmation',
    tags: ['orders'],
    id: null,
    elements: [
      { type: 'meta', title: 'You own "{{data.bookTitle}}" — thank you!' },
      {
        type: 'text',
        content: 'Thank you for your purchase!',
        align: 'left',
      },
      {
        type: 'text',
        content: '{{data.bookTitle}}',
        align: 'left',
      },
      {
        type: 'text',
        content: 'Amount paid: {{data.amount}}',
        align: 'left',
      },
      {
        type: 'text',
        content: 'You can now read your book anytime in your library.',
        align: 'left',
      },
    ],
  },
  {
    name: 'Admin Order Notification',
    tags: ['orders', 'admin'],
    id: null,
    elements: [
      { type: 'meta', title: 'New order: {{data.bookTitle}}' },
      {
        type: 'text',
        content: 'A new order has been placed:',
        align: 'left',
      },
      {
        type: 'text',
        content: 'Book: {{data.bookTitle}}',
        align: 'left',
      },
      {
        type: 'text',
        content: 'Customer: {{data.customerName}}',
        align: 'left',
      },
      {
        type: 'text',
        content: 'Email: {{data.customerEmail}}',
        align: 'left',
      },
      {
        type: 'text',
        content: 'Amount: {{data.amount}}',
        align: 'left',
      },
    ],
  },
]

// First pass: create all templates
const createdIds = []
for (const cfg of templateConfigs) {
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
  console.log(`✅ Created "${cfg.name}" — ID: ${result.id}`)
  createdIds.push(result.id)
}

// Second pass: add HTML content via putContent for rich email rendering
const htmlContents = [
  {
    id: createdIds[0],
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
  },
  {
    id: createdIds[1],
    html: `<div style="max-width:480px;margin:0 auto;font-family:sans-serif;">
  <h1 style="color:#8B5CF6;">TransformHer</h1>
  <p>Thank you for your purchase!</p>
  <p style="font-size:18px;font-weight:600;">{{data.bookTitle}}</p>
  <p>Amount paid: <strong>{{data.amount}}</strong></p>
  <p style="margin-top:24px;color:#6b7280;font-size:14px;">
    You can now read your book anytime in your library.
  </p>
</div>`,
  },
  {
    id: createdIds[2],
    html: `<div style="max-width:480px;margin:0 auto;font-family:sans-serif;">
  <h1 style="color:#8B5CF6;">New Order</h1>
  <table style="width:100%;border-collapse:collapse;margin-top:16px;">
    <tr><td style="padding:8px 0;color:#6b7280;">Book</td><td style="font-weight:600;">{{data.bookTitle}}</td></tr>
    <tr><td style="padding:8px 0;color:#6b7280;">Customer</td><td>{{data.customerName}}</td></tr>
    <tr><td style="padding:8px 0;color:#6b7280;">Email</td><td>{{data.customerEmail}}</td></tr>
    <tr><td style="padding:8px 0;color:#6b7280;">Amount</td><td>{{data.amount}}</td></tr>
  </table>
</div>`,
  },
]

const subjects = [
  'Reset your TransformHer password',
  'You own "{{data.bookTitle}}" — thank you!',
  'New order: {{data.bookTitle}}',
]

for (let i = 0; i < htmlContents.length; i++) {
  const { id, html } = htmlContents[i]
  try {
    await client.notifications.putContent(id, {
      content: {
        version: '2022-01-01',
        elements: [
          { type: 'meta', title: subjects[i] },
          { type: 'channel', channel: 'email', raw: { html } },
        ],
      },
      state: 'PUBLISHED',
    })
    console.log(`✅ Updated HTML content for ${id}`)
  } catch (err) {
    console.error(`❌ HTML update failed for ${id}:`, err.message)
  }
}
