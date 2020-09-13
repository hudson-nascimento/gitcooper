// @flow
import inquirer from 'inquirer'
import { IssueStatus } from '../../services/redmine'

import configurationVault from '../../utils/configurationVault'
import filterGitmojis from '../../utils/filterGitmojis'
import filter from './filter'
import guard from './guard'

const TITLE_MAX_LENGTH_COUNT: number = 48

inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'))

export type Gitmoji = {
  code: string,
  description: string,
  emoji: string,
  name: string
}

export type Answers = {
  gitmoji: string,
  scope?: string,
  title: string,
  message: string,
  refs: string,
  coAuthors: string,
  timeEntry: boolean,
  sandbox?: boolean,
  newStatus: number
}

export type Options = {
  refs: boolean,
  coAuthors: boolean,
  timeEntry: boolean,
  sandbox?: boolean,
  changeStatus: boolean
}

export default (gitmojis: Array<Gitmoji>, options: Options): Array<Object> => [
  {
    name: 'gitmoji',
    message: 'Choose a gitmoji:',
    type: 'autocomplete',
    source: (answersSoFor: any, input: string) => {
      return Promise.resolve(
        filterGitmojis(input, gitmojis).map((gitmoji) => ({
          name: `${gitmoji.emoji}  - ${gitmoji.description}`,
          value: gitmoji[configurationVault.getEmojiFormat()]
        }))
      )
    }
  },
  ...(configurationVault.getScopePrompt()
    ? [
        {
          name: 'scope',
          message: 'Enter the scope of current changes:',
          validate: guard.scope
        }
      ]
    : []),
  {
    name: 'title',
    message: 'Enter the commit title:',
    validate: guard.title,
    transformer: (input: string) => {
      return `[${input.length}/${TITLE_MAX_LENGTH_COUNT}]: ${input}`
    }
  },
  {
    name: 'message',
    message: 'Enter the commit message:',
    validate: guard.message
  },
  ...((options && options.refs) || false
    ? [
        {
          name: 'refs',
          message: 'Issue reference:',
          filter: filter.refs
        }
      ]
    : []),
  ...((options && options.coAuthors) || false
    ? [
        {
          name: 'coAuthors',
          message: 'Co-authors (Separated by comma):',
          validate: guard.coAuthors,
          filter: filter.coAuthors
        }
      ]
    : []),
  ...((options && options.timeEntry) || false
    ? [
        {
          name: 'timeEntry',
          type: 'confirm',
          default: true,
          message: 'Create time entry on Redmine?:'
        }
      ]
    : []),
  ...((options && options.sandbox) || false
    ? [
        {
          name: 'sandbox',
          type: 'confirm',
          default: true,
          message: 'Use sandbox?:'
        }
      ]
    : []),
  ...((options && options.changeStatus) || false
    ? [
        {
          name: 'newStatus',
          type: 'list',
          default: IssueStatus.FINISHED,
          choices: [
            {
              name: 'Finished',
              value: IssueStatus.FINISHED
            },
            {
              name: 'Paused',
              value: IssueStatus.PAUSED
            },
            {
              name: 'Homolog',
              value: IssueStatus.HOMOLOG
            }
          ],
          message: 'New issue status:'
        }
      ]
    : [])
]
