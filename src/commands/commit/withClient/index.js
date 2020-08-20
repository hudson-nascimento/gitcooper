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

    const { stdout } = await execa('git', cmdArgs)

    if (answers.spendTime) {
      const issue = answers.refs ? answers.refs.replace('#', '').trim() : ''
      if (!issue.length) {
        throw new Error(
          `No issue defined. Please, use the option --refs and type the issue number. E.g.: #1064, or 0 (For last updated task in execution). To create spend time registry manually run: npm run spend-time --env issue=${issue},comment="${title}"`
        )
      }

      console.log(`Creating spend time on Redmine for issue ${issue}...`)
      const baseFolder = `${__dirname}/../../../../cypress`
      const integrationFolder = `${baseFolder}/integration`
      const videosFolder = `${baseFolder}/videos`
      const pluginsFile = `${baseFolder}/plugins/index.js`
      const supportFile = `${baseFolder}/support/index.js`
      // TODO: Screenshots folder

      const { totalPassed, runs } = await cypress.run({
        quiet: true,
        spec: `${integrationFolder}/spend-time.spec.js`,
        configFile: false,
        config: {
          integrationFolder,
          pluginsFile,
          videosFolder,
          supportFile
        },
        env: {
          username: configurationVault.getLdapUsername(),
          password: configurationVault.getLdapPassword(),
          issue,
          comment: title
        }
      })

      if (totalPassed === 1) {
        console.log(`Spend time has been created with success on Redmine!`)
      } else {
        console.error(
          'Failed to create spend time on Redmine! Please, check log above.'
        )
        console.info(
          `Run: npm run spend-time --env issue=${issue},comment="${title}" to retry`
        )
      }
      console.log(`You can see the video in: ${runs[0].video}`)
    }

    console.log(stdout)
  } catch (error) {
    console.error(error)
  }
}

export default withClient
