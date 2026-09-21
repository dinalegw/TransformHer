'use client'

import Script from 'next/script'
import { usePathname } from 'next/navigation'
import { isTranslationAllowedPath } from '@/lib/translation-routes'

type TranslateLanguage = {
  id: string
  name: string
}

type TranslateJsApi = {
  to?: string
  changeLanguage?: (language: string) => void
  language?: {
    setLocal?: (language: string) => void
    getLocal?: () => string
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
    customUI?: (languageList: TranslateLanguage[]) => void
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

function installSingleLanguageSelector(translate: TranslateJsApi) {
  const selector = translate.selectLanguageTag
  if (!selector) return

  selector.show = true
  selector.documentId = 'translate'

  // translate.js officially supports replacing its native select renderer.
  // Owning the renderer here guarantees the mount contains exactly one select,
  // even when Next.js remounts the Script component or refreshRender runs again.
  selector.customUI = (languageList) => {
    const mount = document.getElementById('translate')
    if (!mount) return

    const select = document.createElement('select')
    select.id = 'translateSelectLanguage'
    select.className = 'translateSelectLanguage'
    select.setAttribute('aria-label', 'Choose language')

    const selectedLanguage =
      translate.to || translate.language?.getLocal?.() || 'english'

    const seen = new Set<string>()
    for (const language of languageList) {
      if (!language?.id || seen.has(language.id)) continue
      seen.add(language.id)

      const option = document.createElement('option')
      option.value = language.id
      option.textContent = language.name || language.id
      option.selected = language.id === selectedLanguage
      select.appendChild(option)
    }

    select.addEventListener('change', (event) => {
      const target = event.currentTarget as HTMLSelectElement
      translate.changeLanguage?.(target.value)
    })

    // Atomic replacement: never append alongside an older translator control.
    mount.replaceChildren(select)
  }
}

function initializeTranslateJs() {
  const translate = window.translate
  if (!translate) return

  installSingleLanguageSelector(translate)

  if (initialized) {
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
