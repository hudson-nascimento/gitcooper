// @flow
import execa from 'execa'
import chalk from 'chalk'
import cypress from 'cypress'

import isHookCreated from '../../../utils/isHookCreated'
import getContacts from '../../../utils/getContacts'
import configurationVault from '../../../utils/configurationVault'
import { type Answers } from '../prompts'

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

    if (answers.timeEntry) {
      const issue = answers.refs ? answers.refs.replace('#', '').trim() : null

      if (issue) {
        console.log(`Creating time entry on Redmine for issue ${issue}...`)
      } else {
        console.log(
          `Creating time entry on Redmine for last updated issue in execution...`
        )
      }

      const baseFolder = `${__dirname}/../../../../cypress`
      const integrationFolder = `${baseFolder}/integration`
      const videosFolder = `${baseFolder}/videos`
      const pluginsFile = `${baseFolder}/plugins/index.js`
      const supportFile = `${baseFolder}/support/index.js`
      const screenshotsFolder = `${baseFolder}/screenshots`

      const { totalPassed, runs } = await cypress.run({
        quiet: true,
        spec: `${integrationFolder}/time-entry.spec.js`,
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
          issue,
          comment: title,
          sandbox: answers.sandbox
        }
      })

      // TODO: Get issue from redmine if refs option is equals to "0"

      if (totalPassed === 1) {
        console.log(`Time entry has been created with success on Redmine!`)
      } else {
        console.error(
          'Failed to create time entry on Redmine! Please, check log above.'
        )
        console.info(
          `Run: yarn time-entry --env issue=${issue},comment="${title}" to retry`
        )
      }
      console.log(`You can see the video in: ${runs[0].video}`)
    }

    if (!answers.sandbox) {
      const { stdout } = await execa('git', cmdArgs)

      console.log(stdout)
    } else {
      console.log(`Sandbox: git ${cmdArgs.join(' ')}`)
    }
  } catch (error) {
    console.error(error)
  }
}

export default withClient
