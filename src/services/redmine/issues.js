import api from "./api";

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
  const {
    data: { issues }
  } = await api.get<{ issues: { id: number }[] }>(
    'issues.json',
    {
      params: {
        assigned_to_id: 'me',
        status_id: IssueStatus.EXECUTING,
        sort: 'updated_on:desc',
        limit: 1
      }
    }
  )

  const [issue] = issues;

  if (!issue) {
    throw new Error('Not found an issue in execution')
  }

  return issue.id;
}

export async function updateIssueStatus(issue: number, status: number) {
  const response = await api.put(`issues/${issue}.json`, {
    issue: {
      status_id: status
    }
  })

  return response.status === 200;
}
