'use client'

import Script from 'next/script'
import { usePathname } from 'next/navigation'
import { isTranslationAllowedPath } from '@/lib/translation-routes'

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
  selectLanguageTag?: {
    show?: boolean
    documentId?: string
    refreshRender?: () => void
  }
  setAutoDiscriminateLocalLanguage?: () => void
  execute?: () => void
}

declare global {
  interface Window {
    translate?: TranslateJsApi
  }
}

let initialized = false

function initializeTranslateJs() {
  const translate = window.translate
  if (!translate) return

  if (translate.selectLanguageTag) {
    translate.selectLanguageTag.show = true
    translate.selectLanguageTag.documentId = 'translate'
  }

  if (initialized) {
    // Next.js can call Script onReady again after route transitions/remounts.
    // translate.js refreshRender() appends a new <select>, so clear the mount
    // first to guarantee exactly one visible language selector.
    document.getElementById('translate')?.replaceChildren()
    translate.selectLanguageTag?.refreshRender?.()
    return
  }

  translate.language?.setLocal?.('english')
  translate.service?.use?.('translate.service')
  translate.request?.setHost?.([
    'https://api.translate.zvo.cn/',
    'https://api2.translate.zvo.cn/',
  ])
  translate.listener?.start?.()
  translate.setAutoDiscriminateLocalLanguage?.()
  translate.execute?.()
  initialized = true
}

export function TranslateJs() {
  const pathname = usePathname()

  // Avoid sending authenticated, account, purchase or protected-library page
  // content to a third-party translation service.
  if (!isTranslationAllowedPath(pathname)) return null

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
