/**
 * Layout for the public customer-facing estimate presentation route (/e/...).
 * No dashboard chrome — clean minimal white wrapper.
 */
export default function EstimatePresentationLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Minimal wrapper: no dashboard nav, no sidebar.
  // Background colour is set per-page via inline styles.
  return <>{children}</>
}
