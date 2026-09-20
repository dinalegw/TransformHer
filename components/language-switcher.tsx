export function LanguageSwitcher() {
  return (
    <div
      className="fixed bottom-4 right-4 z-[90] flex items-center gap-2 rounded-full border border-border bg-background/95 px-3 py-2 shadow-lg backdrop-blur"
      aria-label="Choose site language"
    >
      <span className="text-xs font-medium text-muted-foreground">Language</span>
      <div id="translate" className="min-w-[9rem]" />
    </div>
  )
}
