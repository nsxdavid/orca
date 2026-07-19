import { describe, expect, it } from 'vitest'
import { normalizeFolderWorkspaceLinkedTask } from './folder-workspaces'

describe('normalizeFolderWorkspaceLinkedTask', () => {
  it('preserves ClickUp task links and identifiers during hydration', () => {
    expect(
      normalizeFolderWorkspaceLinkedTask({
        provider: 'clickup',
        type: 'issue',
        number: 0,
        title: '  Fix folder workspace hydration  ',
        url: '  https://app.clickup.com/t/86abc123  ',
        clickUpIdentifier: '  CU-86abc123  '
      })
    ).toEqual({
      provider: 'clickup',
      type: 'issue',
      number: 0,
      title: 'Fix folder workspace hydration',
      url: 'https://app.clickup.com/t/86abc123',
      clickUpIdentifier: 'CU-86abc123'
    })
  })
})
