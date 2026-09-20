'use client'

import Script from 'next/script'

type TranslateJsApi = {
  language?: {
    setLocal?: (language: string) => void
  }
  service?: {
    use?: (service: string) => void
  }
  request?: {
    setHost?: (hosts: string[]) => void
  }
  listener?: {
    start?: () => void
  }
  setAutoDiscriminateLocalLanguage?: () => void
  execute?: () => void
}

declare global {
  interface Window {
    translate?: TranslateJsApi
  }
}

function initializeTranslateJs() {
  const translate = window.translate
  if (!translate) return

  // TransformHer's source content is English.
  translate.language?.setLocal?.('english')

  // Keep the full translate.service language catalogue rather than client.edge,
  // whose documented language set is smaller.
  translate.service?.use?.('translate.service')
  translate.request?.setHost?.([
    'https://api.translate.zvo.cn/',
    'https://api2.translate.zvo.cn/',
  ])

  // Translate content rendered after navigation/state updates as well.
  translate.listener?.start?.()

  // Respect a visitor's saved manual language choice first; otherwise allow
  // translate.js to select an appropriate language for first-time visitors.
  translate.setAutoDiscriminateLocalLanguage?.()
  translate.execute?.()
}

export function TranslateJs() {
  return (
    <Script
      id="transformher-translate-js"
      src="https://cdn.staticfile.net/translate.js/3.18.66/translate.js"
      strategy="afterInteractive"
      onLoad={initializeTranslateJs}
      onReady={initializeTranslateJs}
    />
  )
}
