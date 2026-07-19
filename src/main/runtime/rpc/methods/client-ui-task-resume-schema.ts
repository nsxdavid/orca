import { z } from 'zod'

export const ClientUITaskResumeState = z
  .object({
    githubMode: z.enum(['items', 'project']).optional(),
    githubItemsPreset: z.string().nullable().optional(),
    githubItemsQuery: z.string().optional(),
    githubProjectHiddenFieldIdsByView: z.record(z.string(), z.array(z.string())).optional(),
    linearPreset: z.enum(['assigned', 'created', 'all', 'completed']).optional(),
    linearMode: z.enum(['issues', 'projects', 'views']).optional(),
    linearQuery: z.string().optional(),
    linearContext: z
      .object({
        kind: z.enum(['project', 'view']),
        id: z.string(),
        workspaceId: z.string(),
        model: z.enum(['issue', 'project']).optional()
      })
      .strict()
      .optional(),
    jiraPreset: z.enum(['assigned', 'reported', 'all', 'done']).optional(),
    jiraQuery: z.string().optional(),
    clickUpWorkspaceId: z.string().optional(),
    clickUpSpaceId: z.string().optional(),
    clickUpListId: z.string().optional(),
    clickUpViewId: z.string().optional(),
    clickUpQuery: z.string().optional(),
    clickUpSubtaskMode: z.enum(['collapsed', 'expanded', 'separate']).optional(),
    clickUpGroupDirection: z.enum(['ascending', 'descending']).optional(),
    clickUpViewMode: z.enum(['flat', 'tree']).optional(),
    clickUpGrouping: z.enum(['none', 'status', 'priority', 'type', 'tag']).optional(),
    clickUpOrdering: z.enum(['updated', 'priority', 'identity']).optional(),
    clickUpShowClosedTasks: z.boolean().optional(),
    clickUpDisplayProperties: z
      .array(z.enum(['type', 'status', 'priority', 'tags', 'assignees', 'updated']))
      .optional(),
    clickUpExpandedTaskContextKey: z.string().optional(),
    clickUpExpandedTaskIds: z.array(z.string()).optional()
  })
  .strict()
