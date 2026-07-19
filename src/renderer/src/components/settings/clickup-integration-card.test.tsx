// @vitest-environment happy-dom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getProviderRuntimeContextKey } from '@/lib/provider-runtime-context'
import { ClickUpIntegrationCard } from './clickup-integration-card'

type StoreState = {
  clickUpStatus: {
    connected: boolean
    workspaces: { id: string; name: string }[]
    selectedWorkspaceId: string | null
  }
  clickUpStatusChecked: boolean
  clickUpStatusContextKey: string | null
  settings: { activeRuntimeEnvironmentId: string | null }
  connectClickUp: (
    token: string
  ) => Promise<{ ok: true; viewer: { id: string; username: string; email: null } }>
  disconnectClickUp: () => Promise<void>
  checkClickUpConnection: () => Promise<void>
  selectClickUpWorkspace: () => Promise<void>
  testClickUpConnection: () => Promise<{ ok: true; viewer: null }>
  openSettingsPage: () => void
  openSettingsTarget: (target: { pane: string; repoId: string | null }) => void
}

const mocks = vi.hoisted(() => ({
  store: { current: null as StoreState | null }
}))

vi.mock('@/store', () => ({
  useAppStore: (selector: (state: StoreState) => unknown) => {
    if (!mocks.store.current) {
      throw new Error('Store state was not installed')
    }
    return selector(mocks.store.current)
  }
}))

let root: Root | null = null
let container: HTMLDivElement | null = null

function installStore(): StoreState {
  const settings = { activeRuntimeEnvironmentId: null }
  const state: StoreState = {
    clickUpStatus: {
      connected: true,
      workspaces: [{ id: 'workspace-1', name: 'Acme' }],
      selectedWorkspaceId: 'workspace-1'
    },
    clickUpStatusChecked: true,
    clickUpStatusContextKey: getProviderRuntimeContextKey(settings),
    settings,
    connectClickUp: vi.fn(async () => ({
      ok: true as const,
      viewer: { id: 'viewer-1', username: 'Ada', email: null }
    })),
    disconnectClickUp: vi.fn(async () => {}),
    checkClickUpConnection: vi.fn(async () => {}),
    selectClickUpWorkspace: vi.fn(async () => {}),
    testClickUpConnection: vi.fn(async () => ({ ok: true as const, viewer: null })),
    openSettingsPage: vi.fn(),
    openSettingsTarget: vi.fn()
  }
  mocks.store.current = state
  return state
}

async function renderCard(): Promise<HTMLDivElement> {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root?.render(<ClickUpIntegrationCard />)
  })
  return container
}

function findButton(rootElement: ParentNode, label: string): HTMLButtonElement {
  const button = Array.from(rootElement.querySelectorAll('button')).find(
    (candidate) => candidate.textContent?.trim() === label
  )
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Button not found: ${label}`)
  }
  return button
}

async function openReplacementDialog(rendered: HTMLDivElement): Promise<HTMLElement> {
  await act(async () => {
    findButton(rendered, 'Replace token').click()
  })
  const dialog = document.body.querySelector('[role="dialog"]')
  if (!(dialog instanceof HTMLElement)) {
    throw new Error('Replacement dialog did not open')
  }
  return dialog
}

async function enterToken(dialog: HTMLElement, token: string): Promise<void> {
  const input = dialog.querySelector('input[type="password"]')
  if (!(input instanceof HTMLInputElement)) {
    throw new Error('Token input not found')
  }
  await act(async () => {
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    setValue?.call(input, token)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

describe('ClickUpIntegrationCard token replacement', () => {
  afterEach(async () => {
    if (root) {
      await act(async () => {
        root?.unmount()
      })
    }
    root = null
    container?.remove()
    container = null
    mocks.store.current = null
  })

  it('uses replacement-specific labels and explains verify-before-save behavior', async () => {
    installStore()
    const rendered = await renderCard()

    const dialog = await openReplacementDialog(rendered)

    expect(dialog.textContent).toContain('Replace ClickUp token')
    expect(dialog.textContent).toContain(
      'Orca verifies the new token before replacing the current token for this runtime.'
    )
    expect(findButton(dialog, 'Replace token')).toBeInstanceOf(HTMLButtonElement)
  })

  it('recovers from transport errors and clears a canceled secret before reopening', async () => {
    const state = installStore()
    state.connectClickUp = vi.fn(async () => {
      throw new Error('Remote runtime unavailable')
    })
    const rendered = await renderCard()
    let dialog = await openReplacementDialog(rendered)
    await enterToken(dialog, 'replacement-secret')

    await act(async () => {
      findButton(dialog, 'Replace token').click()
    })

    expect(dialog.textContent).toContain('Remote runtime unavailable')
    expect(findButton(dialog, 'Replace token').disabled).toBe(false)

    await act(async () => {
      findButton(dialog, 'Cancel').click()
    })
    dialog = await openReplacementDialog(rendered)
    expect(dialog.querySelector<HTMLInputElement>('input[type="password"]')?.value).toBe('')
  })
})
