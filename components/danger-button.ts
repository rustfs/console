/**
 * Solid danger styling for buttons that commit an irreversible action.
 *
 * The `destructive` Button variant only tints the background (`bg-destructive/10`
 * with a `text-destructive` label), so it cannot carry a filled label. Buttons
 * that confirm a destructive action layer this class on top of the base button
 * classes instead, and read the label from `--destructive-foreground`.
 *
 * That token is a near-white on the light-theme red (4.6:1) and a near-black on
 * the lightened dark-theme red (6.9:1), so the label clears WCAG AA in both
 * themes. Override the fill or the label, never the two independently.
 */
export const DANGER_BUTTON_CLASS =
  "bg-destructive text-destructive-foreground hover:bg-destructive/85 focus-visible:border-destructive/40 focus-visible:ring-destructive/30"
