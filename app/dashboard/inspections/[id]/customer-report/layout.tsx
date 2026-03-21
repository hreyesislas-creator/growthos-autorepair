/**
 * Customer Report Layout
 *
 * Overrides the parent dashboard layout entirely so this route renders
 * without the sidebar, topbar, or dark-theme shell.  The root app/layout.tsx
 * still provides <html> / <body> and the font <link> tags.
 */
export default function CustomerReportLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
