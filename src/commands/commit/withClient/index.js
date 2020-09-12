// @flow
import execa from 'execa'
import chalk from 'chalk'
import cypress from 'cypress'
import axios from 'axios'

import isHookCreated from '../../../utils/isHookCreated'
import getContacts from '../../../utils/getContacts'
import configurationVault from '../../../utils/configurationVault'
import { type Answers, IssueStatusLabel, IssueStatus } from '../prompts'

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

const runCypressCmd = async (commandName: string, env: any) => {
  const baseFolder = `${__dirname}/../../../cypress`
  const integrationFolder = `${baseFolder}/integration`
  const videosFolder = `${baseFolder}/videos`
  const pluginsFile = `${baseFolder}/plugins/index.js`
  const supportFile = `${baseFolder}/support/index.js`
  const screenshotsFolder = `${baseFolder}/screenshots`

  return cypress.run({
    quiet: true,
    spec: `${integrationFolder}/${commandName}.spec.js`,
    configFile: false,
    config: {
      integrationFolder,
      pluginsFile,
      videosFolder,
      supportFile,
      screenshotsFolder
    },
    env: {
      username: configurationVault.getLdapUsername(),
      password: configurationVault.getLdapPassword(),
      ...env
    }
  })
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

    const username = configurationVault.getLdapUsername()
    const password = configurationVault.getLdapPassword()

    const baseUrl = `http://${username}:${password}@redmine.coopersystem.com.br`

    let issue = answers.refs ? answers.refs.replace('#', '').trim() : ''
    if (!issue) {
      const {
        data: { issues }
      } = await axios.get<{ issues: { id: number }[] }>(
        `${baseUrl}/issues.json`,
        {
          params: {
            assigned_to_id: 'me',
            status_id: IssueStatus.EXECUTING,
            sort: 'updated_on:desc',
            limit: 1
          }
        }
      )

      if (issues.length === 0) {
        return console.log(
          chalk.red(
            '\nError: Issue not defined and has no one issue in execution!\n ' +
              'Use the param `--refs` or put an issue in execution.\n'
          )
        )
      }

      issue = issues[0].id
    }

    if (answers.timeEntry) {
      console.log(`Creating time entry on Redmine for issue ${issue}...`)

      const { totalPassed, runs } = await runCypressCmd('time-entry', {
        issue,
        comment: title,
        sandbox: answers.sandbox
      })
      if (totalPassed === 1) {
        console.log(`Time entry has been created with success on Redmine!`)
      } else {
        console.error(
          'Failed to create time entry on Redmine! Please, check log above.'
        )
      }
      console.log(`You can see the video in: ${runs[0].video}`)
    }

    const newStatus = answers.newStatus

    if (newStatus) {
      console.log(
        `The status of the issue will change to "${IssueStatusLabel[newStatus]}"...`
      )

      try {
        if (!answers.sandbox) {
          const response = await axios.put(`${baseUrl}/issues/${issue}.json`, {
            issue: {
              status_id: newStatus
            }
          })

          console.log('Response', response.status, response.data)
        }
        console.log(`Status changed with success!`)
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
