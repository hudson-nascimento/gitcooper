import * as edesenv from '../../../../services/edesenv'
import * as redmine from '../../../../services/redmine'

export default async function(issue: number, comments: string) {
  const workedHours = await edesenv.getWorkedHoursToday()

  const registeredWorkedHours = await redmine.getRegisteredWorkedHours()

  const issueWorkedHours = workedHours - registeredWorkedHours

  console.log('Worked hours today:', workedHours)
  console.log('Registered worked hours:', registeredWorkedHours)

  if (issueWorkedHours < 0) {
    throw new Error(
      'Your time entries on Redmine are greater than your worked hours! Cannot determine issue worked hours. :('
    )
  }

  if (parseFloat(issueWorkedHours.toFixed(2)) === 0.0) {
    throw new Error("It's over for today! See you tomorrow ;)")
  }

  return await redmine.createTimeEntry(issue, issueWorkedHours, comments)
}
