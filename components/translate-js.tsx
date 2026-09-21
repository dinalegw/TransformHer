'use client'

import Script from 'next/script'
import { usePathname } from 'next/navigation'
import { isTranslationAllowedPath } from '@/lib/translation-routes'

type TranslateJsApi = {
  changeLanguage?: (language: string) => void
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
    selectOnChange?: (event: Event) => void
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
let selectorObserver: MutationObserver | null = null

function keepExactlyOneNativeSelector() {
  const mount = document.getElementById('translate')
  if (!mount) return

  const dedupe = () => {
    const selects = Array.from(mount.querySelectorAll('select'))
    selects.slice(1).forEach((select) => select.remove())
  }

  dedupe()

  selectorObserver?.disconnect()
  selectorObserver = new MutationObserver(dedupe)
  selectorObserver.observe(mount, { childList: true, subtree: true })
}

function initializeTranslateJs() {
  const translate = window.translate
  if (!translate) return

  if (translate.selectLanguageTag) {
    translate.selectLanguageTag.show = true
    translate.selectLanguageTag.documentId = 'translate'

    // Bind the language action explicitly. translate.js documents this hook
    // for select changes; relying on the library's implicit handler proved
    // unreliable after Next.js remounts.
    translate.selectLanguageTag.selectOnChange = (event) => {
      const target = event.target as HTMLSelectElement | null
      const language = target?.value
      if (language) translate.changeLanguage?.(language)
    }
  }

  keepExactlyOneNativeSelector()

  if (initialized) {
    const mount = document.getElementById('translate')
    if (mount && !mount.querySelector('select')) {
      translate.selectLanguageTag?.refreshRender?.()
    }
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
