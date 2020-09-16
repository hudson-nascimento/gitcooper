// @flow
import execa from 'execa'
import chalk from 'chalk'

import * as redmine from '../../../services/redmine'

import isHookCreated from '../../../utils/isHookCreated'
import getContacts from '../../../utils/getContacts'
import configurationVault from '../../../utils/configurationVault'
import { type Answers } from '../prompts'
import createTimeEntry from '../options/createTimeEntry'
import updateIssueStatus from '../options/updateIssueStatus'

const getCoAuthor = (coAuthor: string): string | null => {
  coAuthor = coAuthor.trim()
  if (!coAuthor.startsWith('@')) return coAuthor

  const contact = getContacts().find((contact) =>
    contact.trim().startsWith(coAuthor)
  )
  // Contact not found
  if (typeof contact !== 'string') return null

  const [, coAuthoredBy] = contact.split(': ')

  return coAuthoredBy
}

const withClient = async (answers: Answers) => {
  try {
    const scope = answers.scope ? `(${answers.scope}): ` : ''
    const title = `${answers.gitmoji} ${scope}${answers.title}`
    const isSigned = configurationVault.getSignedCommit() ? ['-S'] : []

    if (await isHookCreated()) {
      return console.log(
        chalk.red(
          "\nError: Seems that you're trying to commit with the cli " +
            'but you have the hook created.\nIf you want to use the `gitmoji -c` ' +
            'command you have to remove the hook with the command `gitmoji -r`. \n' +
            'The hook must be used only when you want to commit with the instruction `git commit`\n'
        )
      )
    }

    if (configurationVault.getAutoAdd()) await execa('git', ['add', '.'])

    let cmdArgs = ['commit', ...isSigned, '-m', title]

    if (answers.message) {
      cmdArgs = [...cmdArgs, '-m', answers.message]
    }

    if (answers.refs && answers.refs != '0') {
      cmdArgs = [...cmdArgs, '-m', `Refs ${answers.refs}`]
    }

    if (answers.coAuthors) {
      let coAuthors = ''
      answers.coAuthors.split(',').forEach((coAuthor) => {
        const coAuthoredBy = getCoAuthor(coAuthor)

        if (coAuthoredBy !== null) {
          coAuthors += `Co-authored-by: ${coAuthoredBy}\n`
        }
      })

      if (coAuthors.trim().length) {
        cmdArgs = [...cmdArgs, '-m', coAuthors.slice(0, -1)]
      }
    }

    if (!answers.sandbox) {
      const { stdout } = await execa('git', cmdArgs)

      console.log(stdout)
    } else {
      console.log(`Sandbox: git ${cmdArgs.join(' ')}`)
    }

    let issue = answers.refs ? answers.refs.replace('#', '').trim() : ''
    if (!issue) {
      issue = await redmine.getLastIssueInExecution()
    }

    if (answers.timeEntry) {
      console.log(`Creating time entry on Redmine for issue ${issue}...`)

      const created = await createTimeEntry(issue, title)

      if (created) {
        console.log(`Time entry has been created with success on Redmine!`)
      } else {
        console.error(
          'Failed to create time entry on Redmine! Please, check log above.'
        )
      }
    }

    const newStatus = answers.newStatus

    if (newStatus) {
      console.log(
        `The status of the issue will change to "${redmine.IssueStatusLabel[newStatus]}"...`
      )

      try {
        if (!answers.sandbox) {
          await updateIssueStatus(issue, newStatus)

          console.log('Status changed with success!')
        }
      } catch (err) {
        console.log(
          chalk.red(
            '\nError: Cannot change the issue status!\n ' +
              `Redmine response: ${err.response.data.errors.join(',')}\n`
          )
        )
      }
    }
  } catch (error) {
    console.error(error)
  }
}

export default withClient
