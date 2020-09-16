import redmine from './client'

export const IssueStatus = {
  PAUSED: 10,
  FINISHED: 11,
  HOMOLOG: 5,
  EXECUTING: 3
}

export const IssueStatusLabel = {
  [IssueStatus.FINISHED]: 'Concluída',
  [IssueStatus.PAUSED]: 'Pausada',
  [IssueStatus.HOMOLOG]: 'Em Homologação'
}

export async function getLastIssueInExecution() {
  const { issues } = await redmine.issues().list({
    asignedToId: 'me',
    statusId: IssueStatus.EXECUTING,
    sort: 'updated_on:desc',
    limit: 1
  })

  const [issue] = issues

  if (!issue) {
    throw new Error('Not found an issue in execution')
  }

  return issue.id
}

export async function updateIssueStatus(issue: number, status: number) {
  return redmine.issues().update(issue, {
    statusId: status
  })
}
