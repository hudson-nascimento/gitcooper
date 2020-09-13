import * as edesenv from '../../../../services/edesenv'
import * as redmine from '../../../../services/redmine'

export default async function(issue: number, comments: string) {
  const workedHours = await edesenv.getWorkedHoursToday()
  const registeredWorkedHours = await redmine.getRegisteredWorkedHours()

  const issueWorkedHours = workedHours - registeredWorkedHours

  if (parseFloat(issueWorkedHours.toFixed(2)) === 0.0) {
    throw new Error("It's over for today! See you tomorrow ;)")
  }

  return await redmine.createTimeEntry(issue, issueWorkedHours, comments)
}
