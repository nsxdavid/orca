import { useId, useState } from 'react'
import { AlertCircle, CheckCircle2, LoaderCircle, Unlink } from 'lucide-react'
import { ClickUpIcon } from '@/components/icons/ClickUpIcon'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useMountedRef } from '@/hooks/useMountedRef'
import { getProviderRuntimeContextKey } from '@/lib/provider-runtime-context'
import { useAppStore } from '@/store'
import { IntegrationCardDetails, IntegrationCardShell } from './integration-card-shell'
import { useIntegrationSubordinateRowClass } from './integration-card-presentation'
import { getProviderAccountScope } from './provider-account-scope'
import { ProviderHostScopeControl } from './ProviderHostScopeControl'
import { translate } from '@/i18n/i18n'

type VerificationResult = { state: 'ok' | 'error'; error?: string }

export function ClickUpIntegrationCard(): React.JSX.Element {
  const clickUpStatus = useAppStore((s) => s.clickUpStatus)
  const clickUpStatusChecked = useAppStore((s) => s.clickUpStatusChecked)
  const clickUpStatusContextKey = useAppStore((s) => s.clickUpStatusContextKey)
  const settings = useAppStore((s) => s.settings)
  const connectClickUp = useAppStore((s) => s.connectClickUp)
  const disconnectClickUp = useAppStore((s) => s.disconnectClickUp)
  const checkClickUpConnection = useAppStore((s) => s.checkClickUpConnection)
  const selectClickUpWorkspace = useAppStore((s) => s.selectClickUpWorkspace)
  const testClickUpConnection = useAppStore((s) => s.testClickUpConnection)
  const mountedRef = useMountedRef()
  const tokenInputId = useId()
  const tokenErrorId = useId()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [apiToken, setApiToken] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [connectError, setConnectError] = useState<string | null>(null)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<VerificationResult | null>(null)
  const [selectingWorkspaceId, setSelectingWorkspaceId] = useState<string | null>(null)

  const contextMatches = clickUpStatusContextKey === getProviderRuntimeContextKey(settings)
  const checking = !contextMatches || !clickUpStatusChecked
  const connected = contextMatches && clickUpStatus.connected
  const workspaces = clickUpStatus.workspaces ?? []
  const selectedWorkspaceId =
    clickUpStatus.selectedWorkspaceId ??
    clickUpStatus.activeWorkspaceId ??
    workspaces[0]?.id ??
    null
  const accountScope = getProviderAccountScope(settings)
  const subordinateRowClass = useIntegrationSubordinateRowClass('flex items-center gap-3')
  const accountRowClass = useIntegrationSubordinateRowClass('text-xs')

  const resetTokenDialog = (): void => {
    setApiToken('')
    setConnectError(null)
    setConnecting(false)
  }

  const openTokenDialog = (): void => {
    resetTokenDialog()
    setDialogOpen(true)
  }

  const handleTokenDialogOpenChange = (nextOpen: boolean): void => {
    if (connecting) {
      return
    }
    if (!nextOpen) {
      resetTokenDialog()
    }
    setDialogOpen(nextOpen)
  }

  const handleConnect = async (): Promise<void> => {
    const token = apiToken.trim()
    if (!token || connecting) {
      return
    }
    setConnecting(true)
    setConnectError(null)
    try {
      const result = await connectClickUp(token)
      if (!mountedRef.current) {
        return
      }
      if (result.ok) {
        resetTokenDialog()
        setDialogOpen(false)
        setTestResult(null)
      } else {
        setConnectError(result.error)
      }
    } catch (error) {
      if (mountedRef.current) {
        setConnectError(error instanceof Error ? error.message : 'Connection failed')
      }
    } finally {
      if (mountedRef.current) {
        setConnecting(false)
      }
    }
  }

  const handleTest = async (): Promise<void> => {
    setTesting(true)
    setTestResult(null)
    const result = await testClickUpConnection()
    if (!mountedRef.current) {
      return
    }
    setTesting(false)
    setTestResult(result.ok ? { state: 'ok' } : { state: 'error', error: result.error })
  }

  const handleSelectWorkspace = async (workspaceId: string): Promise<void> => {
    if (workspaceId === selectedWorkspaceId || selectingWorkspaceId !== null) {
      return
    }
    setSelectingWorkspaceId(workspaceId)
    setTestResult(null)
    await selectClickUpWorkspace(workspaceId).finally(() => {
      if (mountedRef.current) {
        setSelectingWorkspaceId(null)
      }
    })
  }

  return (
    <IntegrationCardShell
      icon={<ClickUpIcon className="size-5" />}
      name="ClickUp"
      description={
        connected
          ? translate(
              'auto.components.settings.clickup.integration.card.connected',
              '{{value0}} workspace{{value1}} available',
              { value0: workspaces.length, value1: workspaces.length === 1 ? '' : 's' }
            )
          : checking
            ? translate(
                'auto.components.settings.clickup.integration.card.checking',
                'Checking ClickUp access before showing setup actions.'
              )
            : translate(
                'auto.components.settings.clickup.integration.card.disconnected',
                'Add a ClickUp personal token to browse list tasks.'
              )
      }
      checking={checking}
      statusTone={connected ? 'connected' : 'attention'}
      statusLabel={connected ? 'Connected' : 'Not connected'}
      actions={
        !checking ? (
          <Button variant={connected ? 'outline' : 'default'} size="sm" onClick={openTokenDialog}>
            {connected
              ? translate(
                  'auto.components.settings.clickup.integration.card.replace',
                  'Replace token'
                )
              : translate(
                  'auto.components.settings.clickup.integration.card.connect',
                  'Connect ClickUp'
                )}
          </Button>
        ) : null
      }
    >
      <IntegrationCardDetails>
        <ProviderHostScopeControl
          labelPrefix={translate(
            'auto.components.settings.task.tracker.integration.cards.account_scope_prefix',
            'Account scope'
          )}
          scope={accountScope}
          className={accountRowClass}
        />
        {connected ? (
          <div className="space-y-2">
            {workspaces.map((workspace) => (
              <div key={workspace.id} className={subordinateRowClass}>
                <div className="min-w-0 flex-1">
                  <p className="flex min-w-0 items-center gap-2 truncate text-sm font-medium text-foreground">
                    <span className="truncate">{workspace.name}</span>
                    {workspace.id === selectedWorkspaceId ? (
                      <span className="shrink-0 rounded border border-status-success/30 bg-status-success/10 px-1.5 py-0.5 text-[11px] text-status-success">
                        {translate(
                          'auto.components.settings.clickup.integration.card.selected',
                          'Selected'
                        )}
                      </span>
                    ) : null}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{workspace.id}</p>
                </div>
                {workspace.id !== selectedWorkspaceId ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void handleSelectWorkspace(workspace.id)}
                    disabled={selectingWorkspaceId !== null}
                  >
                    {selectingWorkspaceId === workspace.id ? (
                      <LoaderCircle className="size-3.5 mr-1.5 animate-spin" />
                    ) : null}
                    {translate(
                      'auto.components.settings.clickup.integration.card.useWorkspace',
                      'Use'
                    )}
                  </Button>
                ) : null}
              </div>
            ))}
            {testResult?.state === 'ok' ? (
              <span className="flex items-center gap-1 text-xs text-status-success">
                <CheckCircle2 className="size-3.5" />
                {translate(
                  'auto.components.settings.task.tracker.integration.cards.a2c0015fb8',
                  'Verified'
                )}
              </span>
            ) : null}
            {testResult?.state === 'error' ? (
              <span className="flex items-center gap-1 text-xs text-destructive">
                <AlertCircle className="size-3.5" />
                {testResult.error}
              </span>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleTest()}
                disabled={testing}
              >
                {testing ? (
                  <>
                    <LoaderCircle className="size-3.5 mr-1.5 animate-spin" />
                    {translate(
                      'auto.components.settings.task.tracker.integration.cards.3e7c10d286',
                      'Testing...'
                    )}
                  </>
                ) : (
                  translate(
                    'auto.components.settings.task.tracker.integration.cards.c24e56c532',
                    'Test'
                  )
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setTestResult(null)
                  void disconnectClickUp()
                }}
              >
                <Unlink className="size-3.5" />
                {translate(
                  'auto.components.settings.clickup.integration.card.disconnect',
                  'Disconnect'
                )}
              </Button>
            </div>
          </div>
        ) : !checking ? (
          <>
            <p className="text-xs text-muted-foreground">
              {translate(
                'auto.components.settings.clickup.integration.card.help',
                'Use a personal API token from ClickUp settings. Orca stores it encrypted for the active runtime.'
              )}
            </p>
            <Button variant="ghost" size="sm" onClick={() => void checkClickUpConnection()}>
              {translate(
                'auto.components.settings.task.tracker.integration.cards.c90f2ef419',
                'Re-check'
              )}
            </Button>
          </>
        ) : null}
      </IntegrationCardDetails>

      <Dialog open={dialogOpen} onOpenChange={handleTokenDialogOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {connected
                ? translate(
                    'auto.components.settings.clickup.integration.card.replaceDialogTitle',
                    'Replace ClickUp token'
                  )
                : translate(
                    'auto.components.settings.clickup.integration.card.dialogTitle',
                    'Connect ClickUp'
                  )}
            </DialogTitle>
            <DialogDescription>
              {connected
                ? translate(
                    'auto.components.settings.clickup.integration.card.replaceDialogDescription',
                    'Orca verifies the new token before replacing the current token for this runtime.'
                  )
                : translate(
                    'auto.components.settings.clickup.integration.card.dialogDescription',
                    'Paste a ClickUp personal API token for the active runtime.'
                  )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor={tokenInputId} className="text-xs">
              {translate(
                'auto.components.settings.clickup.integration.card.tokenLabel',
                'Personal API token'
              )}
            </Label>
            <Input
              id={tokenInputId}
              autoFocus
              type="password"
              value={apiToken}
              onChange={(event) => {
                setApiToken(event.target.value)
                if (connectError) {
                  setConnectError(null)
                }
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  void handleConnect()
                }
              }}
              disabled={connecting}
              aria-invalid={connectError !== null}
              aria-describedby={connectError ? tokenErrorId : undefined}
              placeholder={translate(
                'auto.components.settings.clickup.integration.card.tokenPlaceholder',
                'Personal API token'
              )}
            />
            {connectError ? (
              <p id={tokenErrorId} className="text-xs text-destructive">
                {connectError}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => handleTokenDialogOpenChange(false)}
              disabled={connecting}
            >
              {translate('auto.components.settings.clickup.integration.card.cancel', 'Cancel')}
            </Button>
            <Button onClick={() => void handleConnect()} disabled={!apiToken.trim() || connecting}>
              {connecting ? (
                <>
                  <LoaderCircle className="size-3.5 mr-1.5 animate-spin" />
                  {translate(
                    'auto.components.settings.clickup.integration.card.connecting',
                    'Connecting...'
                  )}
                </>
              ) : connected ? (
                translate(
                  'auto.components.settings.clickup.integration.card.replaceSubmit',
                  'Replace token'
                )
              ) : (
                translate(
                  'auto.components.settings.clickup.integration.card.connect',
                  'Connect ClickUp'
                )
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </IntegrationCardShell>
  )
}
