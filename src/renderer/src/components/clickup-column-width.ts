export function getClickUpResizedColumnWidth({
  startWidth,
  startX,
  currentX,
  minWidth,
  maxWidth
}: {
  startWidth: number
  startX: number
  currentX: number
  minWidth: number
  maxWidth: number
}): number {
  // Property columns sit to the right of the flexible title, so dragging left makes them wider.
  return Math.min(maxWidth, Math.max(minWidth, startWidth - (currentX - startX)))
}
