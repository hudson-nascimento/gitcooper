import redmine from './client'

export async function getRegisteredWorkedHours() {
  const timeEntries = await redmine.timeEntries().list({
    userId: 'me',
    from: new Date(),
    to: new Date(),
    limit: 100
  })

  return timeEntries.reduce((n, { hours }) => n + hours, 0)
}

export async function createTimeEntry(
  issue: number,
  hours: number,
  comments = ''
) {
  return redmine.timeEntries().create({
    hours,
    issueId: issue,
    comments
  })
}
