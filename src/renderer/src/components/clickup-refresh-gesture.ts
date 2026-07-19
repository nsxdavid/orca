type ClickUpRefreshGesture = Pick<MouseEvent, 'ctrlKey' | 'metaKey'>

export function isClickUpColdRefreshGesture(
  event: ClickUpRefreshGesture,
  userAgent: string
): boolean {
  return userAgent.includes('Mac') ? event.metaKey : event.ctrlKey
}
