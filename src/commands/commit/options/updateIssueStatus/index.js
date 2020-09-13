import * as redmine from '../../../../services/redmine'

export default async function(issue: number, status: number) {
  return redmine.updateIssueStatus(issue, status)
}
