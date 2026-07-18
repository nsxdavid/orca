import { useEffect, useState } from 'react'

import { useAppStore } from '@/store'
import type { ClickUpListViews } from '../../../shared/types'
import type { TaskSourceContext } from '../../../shared/task-source-context'

const EMPTY_VIEWS: ClickUpListViews = { views: [], requiredViews: [] }

export function useClickUpListViews(args: {
  enabled: boolean
  listId: string | null
  workspaceId: string | null
  sourceContext: TaskSourceContext | null
  refreshNonce: number
}): { data: ClickUpListViews; loading: boolean; loaded: boolean; error: string | null } {
  const fetchViews = useAppStore((state) => state.fetchClickUpViews)
  const [data, setData] = useState<ClickUpListViews>(EMPTY_VIEWS)
  const [loading, setLoading] = useState(false)
  const [loadedListId, setLoadedListId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!args.enabled || !args.listId || !args.workspaceId) {
      setData(EMPTY_VIEWS)
      setLoading(false)
      setLoadedListId(null)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setLoadedListId(null)
    setError(null)
    void fetchViews(args.listId, args.workspaceId, {
      force: args.refreshNonce > 0,
      sourceContext: args.sourceContext
    })
      .then((views) => {
        if (!cancelled) {
          setData(views)
          setLoading(false)
          setLoadedListId(args.listId)
        }
      })
      .catch((cause) => {
        if (!cancelled) {
          setData(EMPTY_VIEWS)
          setLoading(false)
          setError(cause instanceof Error ? cause.message : 'Failed to load ClickUp views.')
        }
      })

    return () => {
      cancelled = true
    }
  }, [
    args.enabled,
    args.listId,
    args.refreshNonce,
    args.sourceContext,
    args.workspaceId,
    fetchViews
  ])

  return { data, loading, loaded: loadedListId === args.listId, error }
}
