import chalk from 'chalk'
import inquirer from 'inquirer'
import execa from 'execa'
import fs from 'fs'
const mockProcess = require('jest-mock-process')

import configurationVault from '../../src/utils/configurationVault'
import getEmojis from '../../src/utils/getEmojis'
import isHookCreated from '../../src/utils/isHookCreated'
import commit from '../../src/commands/commit'
import guard from '../../src/commands/commit/guard'
import prompts from '../../src/commands/commit/prompts'
import * as stubs from './stubs'
import filter from '../../src/commands/commit/filter'
import * as redmine from '../../src/services/redmine'
import createTimeEntry from '../../src/commands/commit/options/createTimeEntry'
import updateIssueStatus from '../../src/commands/commit/options/updateIssueStatus'

jest.mock('../../src/utils/getEmojis')
jest.mock('../../src/utils/isHookCreated')
jest.mock('../../src/utils/configurationVault')
jest.mock('../../src/services/redmine')
jest.mock('../../src/commands/commit/options/createTimeEntry')
jest.mock('../../src/commands/commit/options/updateIssueStatus')

describe('commit command', () => {
  describe('withClient', () => {
    describe('with no autoAdd and no signed commits and no scope and no refs and no co-authors and', () => {
      beforeAll(() => {
        console.error = jest.fn()
        console.log = jest.fn()
        execa.mockReturnValue({ stdout: stubs.commitResult })
        inquirer.prompt.mockReturnValue(
          Promise.resolve(stubs.clientCommitAnswers)
        )
        getEmojis.mockResolvedValue(stubs.gitmojis)
        isHookCreated.mockResolvedValue(false)
        commit('client')
      })

      it('should call inquirer with prompts', () => {
        expect(inquirer.prompt.mock.calls).toMatchSnapshot()
      })

      it('should call execa with the commit command based on answers', () => {
        expect(execa).toHaveBeenCalledWith('git', [
          'commit',
          '-m',
          `${stubs.clientCommitAnswers.gitmoji} ${stubs.clientCommitAnswers.title}`,
          '-m',
          stubs.clientCommitAnswers.message
        ])
      })

      it('should print the result to the console', () => {
        expect(console.log).toHaveBeenCalledWith(stubs.commitResult)
      })

      it('should not try get issue in execution on redmine', () => {
        expect(redmine.getLastIssueInExecution).not.toHaveBeenCalled()
      })
    })

    describe('without refs, with time entry and newStatus', () => {
      const lastIssueInExecution = 1
      beforeAll(() => {
        console.log = jest.fn()
        redmine.getLastIssueInExecution.mockReturnValue(lastIssueInExecution)
        inquirer.prompt.mockReturnValue(
          Promise.resolve(
            stubs.clientCommitAnswersWithoutRefsWithTimeEntryAndNewStatus
          )
        )
        getEmojis.mockResolvedValue(stubs.gitmojis)
        isHookCreated.mockResolvedValue(false)

        commit('client', { timeEntry: true, changeStatus: true })
      })

      it('should get last issue in execution', () => {
        expect(redmine.getLastIssueInExecution).toHaveBeenCalledTimes(1)
      })
      it('should call command to create a time entry using last issue in execution and commit title', () => {
        expect(createTimeEntry).toHaveBeenCalledTimes(1)
        expect(createTimeEntry).toHaveBeenCalledWith(
          lastIssueInExecution,
          stubs.clientCommitAnswersWithoutRefsWithTimeEntryAndNewStatus.title
        )
      })
      it('should call command to update issue status using last issue in execution and new status', () => {
        expect(updateIssueStatus).toHaveBeenCalledTimes(1)
        expect(updateIssueStatus).toHaveBeenCalledWith(
          lastIssueInExecution,
          stubs.clientCommitAnswersWithoutRefsWithTimeEntryAndNewStatus
            .newStatus
        )
      })
    })

    describe('with refs and with time entry and newStatus', () => {
      describe('with created time entry returning true and update issue status throwing an error', () => {
        beforeAll(() => {
          createTimeEntry.mockReset()
          updateIssueStatus.mockReset()
          redmine.getLastIssueInExecution.mockReset()

          console.log = jest.fn()
          inquirer.prompt.mockReturnValue(
            Promise.resolve(
              stubs.clientCommitAnswersWithRefsWithTimeEntryAndNewStatus
            )
          )
          getEmojis.mockResolvedValue(stubs.gitmojis)
          isHookCreated.mockResolvedValue(false)
          createTimeEntry.mockReturnValue(true)

          updateIssueStatus.mockImplementation(() =>
            Promise.reject({
              response: {
                data: {
                  errors: ['Unexpected error']
                }
              }
            })
          )

          commit('client', { timeEntry: true, changeStatus: true, refs: true })
        })

        it.only('should print the errors on console', () => {
          expect(console.log).toHaveBeenLastCalledWith(
            chalk.red(
              '\nError: Cannot change the issue status!\n Redmine response: Unexpected error\n'
            )
          )
        })
      })

      describe('All executing with success', () => {
        beforeAll(() => {
          createTimeEntry.mockReset()
          updateIssueStatus.mockReset()
          redmine.getLastIssueInExecution.mockReset()

          console.log = jest.fn()
          inquirer.prompt.mockReturnValue(
            Promise.resolve(
              stubs.clientCommitAnswersWithRefsWithTimeEntryAndNewStatus
            )
          )
          getEmojis.mockResolvedValue(stubs.gitmojis)
          isHookCreated.mockResolvedValue(false)

          commit('client', { timeEntry: true, changeStatus: true, refs: true })
        })
        it('should not try get last issue in execution', () => {
          expect(redmine.getLastIssueInExecution).toHaveBeenCalledTimes(0)
        })

        it('should call command to create a time entry for issue in refs', () => {
          expect(createTimeEntry).toHaveBeenCalledTimes(1)
          expect(createTimeEntry).toHaveBeenCalledWith(
            stubs.clientCommitAnswersWithRefsWithTimeEntryAndNewStatus.refs,
            stubs.clientCommitAnswersWithoutRefsWithTimeEntryAndNewStatus.title
          )
        })
        it('should call command to update issue status for issue in refs', () => {
          expect(updateIssueStatus).toHaveBeenCalledTimes(1)
          expect(updateIssueStatus).toHaveBeenCalledWith(
            stubs.clientCommitAnswersWithRefsWithTimeEntryAndNewStatus.refs,
            stubs.clientCommitAnswersWithoutRefsWithTimeEntryAndNewStatus
              .newStatus
          )
        })
      })
    })

    describe('with autoAdd, signed commits, scope, refs and co-authors', () => {
      beforeAll(() => {
        inquirer.prompt.mockReset()

        console.log = jest.fn()
        execa.mockReturnValue({ stdout: stubs.commitResult })
        inquirer.prompt.mockReturnValue(
          Promise.resolve(stubs.clientCommitAnswersWithScopeAndOptions)
        )
        getEmojis.mockResolvedValue(stubs.gitmojis)
        isHookCreated.mockResolvedValue(false)
        configurationVault.getContacts.mockReturnValue(
          stubs.clientCommitContactsConfig
        )
        configurationVault.getAutoAdd.mockReturnValue(true)
        configurationVault.getSignedCommit.mockReturnValue(true)
        commit('client', { coAuthors: true, refs: true })
      })

      it('should call inquirer with prompts', () => {
        expect(inquirer.prompt.mock.calls).toMatchSnapshot()
      })

      it('should call execa with the add command', () => {
        expect(execa).toHaveBeenCalledWith('git', ['add', '.'])
      })

      it('should call execa with the commit command based on answers', () => {
        expect(execa).toHaveBeenLastCalledWith('git', [
          'commit',
          '-S',
          '-m',
          `${stubs.clientCommitAnswersWithScopeAndOptions.gitmoji} (${stubs.clientCommitAnswersWithScopeAndOptions.scope}): ${stubs.clientCommitAnswersWithScopeAndOptions.title}`,
          '-m',
          stubs.clientCommitAnswersWithScopeAndOptions.message,
          '-m',
          stubs.clientCommitRefsMounted,
          '-m',
          stubs.clientCommitCoAuthorsMounted
        ])
      })

      it('should print the result to the console', () => {
        expect(console.log).toHaveBeenCalledWith(stubs.commitResult)
      })
    })

    describe('with the commit hook created', () => {
      beforeAll(() => {
        console.log = jest.fn()
        inquirer.prompt.mockReturnValue(
          Promise.resolve(stubs.clientCommitAnswers)
        )
        getEmojis.mockResolvedValue(stubs.gitmojis)
        isHookCreated.mockResolvedValue(true)
        commit('client')
      })

      it('should call inquirer with prompts', () => {
        expect(inquirer.prompt.mock.calls).toMatchSnapshot()
      })

      it('should stop the commit because the hook is created and log the explanation to the user', () => {
        expect(console.log).toHaveBeenCalledWith(expect.any(String))
        expect(execa).not.toHaveBeenCalledWith()
      })
    })
  })

  describe('withHook', () => {
    describe('without scope', () => {
      beforeAll(() => {
        console.log = jest.fn()
        inquirer.prompt.mockReturnValue(
          Promise.resolve(stubs.clientCommitAnswers)
        )
        getEmojis.mockResolvedValue(stubs.gitmojis)
        mockProcess.mockProcessExit()
        process.argv[3] = stubs.argv
        commit('hook')
      })

      it('should commit using the hook', () => {
        expect(fs.writeFileSync).toHaveBeenCalledWith(
          stubs.argv,
          `${stubs.clientCommitAnswers.gitmoji} ${stubs.clientCommitAnswers.title}\n\n${stubs.clientCommitAnswers.message}`
        )
      })

      it('should call process.exit', () => {
        expect(process.exit).toHaveBeenCalledWith(0)
      })
    })

    describe('with scope', () => {
      beforeAll(() => {
        console.log = jest.fn()
        inquirer.prompt.mockReturnValue(
          Promise.resolve(stubs.clientCommitAnswersWithScopeAndOptions)
        )
        getEmojis.mockResolvedValue(stubs.gitmojis)
        mockProcess.mockProcessExit()
        process.argv[3] = stubs.argv
        commit('hook')
      })

      it('should commit using the hook', () => {
        expect(fs.writeFileSync).toHaveBeenCalledWith(
          stubs.argv,
          `${stubs.clientCommitAnswersWithScopeAndOptions.gitmoji} (${stubs.clientCommitAnswersWithScopeAndOptions.scope}): ${stubs.clientCommitAnswersWithScopeAndOptions.title}\n\n${stubs.clientCommitAnswersWithScopeAndOptions.message}`
        )
      })

      it('should call process.exit', () => {
        expect(process.exit).toHaveBeenCalledWith(0)
      })
    })
    describe('when receiving a signal interrupt', () => {
      it('should call process.exit(0)', async () => {
        const warnConsoleSpy = jest.spyOn(console, 'warn').mockImplementation()

        // mock process.on and process.kill to test registerHookInterruptionHandler
        const processEvents = {}
        jest.spyOn(process, 'on').mockImplementation((signal, cb) => {
          processEvents[signal] = cb
        })
        jest.spyOn(process, 'kill').mockImplementation((pid, signal) => {
          processEvents[signal]()
        })

        inquirer.prompt.mockImplementation(() => {
          process.kill(process.pid, 'SIGINT')
        })
        getEmojis.mockResolvedValue(stubs.gitmojis)

        // Use an exception to suspend code execution to simulate process.exit
        mockProcess.mockProcessExit(new Error('SIGINT'))
        process.argv[3] = stubs.argv

        try {
          await commit('hook')
        } catch (e) {
          expect(e.message).toMatch('SIGINT')
        }

        expect(warnConsoleSpy).toHaveBeenCalledWith(
          'gitmoji-cli was interrupted'
        )
        expect(process.exit).toHaveBeenCalledWith(0)
      })
    })
  })

  describe('guard', () => {
    it('should match guard', () => {
      expect(guard).toMatchSnapshot()
    })

    describe('title', () => {
      it('should return true when valid', () => {
        expect(guard.title(stubs.commitTitle)).toBe(true)
      })

      it('should return error message when empty', () => {
        expect(guard.title('')).toEqual(expect.any(String))
      })

      it('should return error message with invalid characters', () => {
        expect(guard.title(stubs.commitTitleInvalid)).toEqual(
          expect.any(String)
        )
      })
    })

    describe('message', () => {
      it('should return true when valid', () => {
        expect(guard.title(stubs.commitTitle)).toBe(true)
      })

      it('should return error message when empty', () => {
        expect(guard.title('')).toEqual(expect.any(String))
      })

      it('should return error message with invalid characters', () => {
        expect(guard.title(stubs.commitTitleInvalid)).toEqual(
          expect.any(String)
        )
      })
    })

    describe('scope', () => {
      it('should return true when valid', () => {
        expect(guard.title(stubs.commitTitle)).toBe(true)
      })

      it('should return error message when empty', () => {
        expect(guard.title('')).toEqual(expect.any(String))
      })

      it('should return error message with invalid characters', () => {
        expect(guard.title(stubs.commitTitleInvalid)).toEqual(
          expect.any(String)
        )
      })
    })

    describe('coAuthors', () => {
      beforeAll(() => {
        configurationVault.getContacts.mockReturnValue(
          stubs.clientCommitContactsConfig
        )
      })

      it('should return true when has no contacts to validate', () => {
        expect(guard.coAuthors(stubs.commitCoAuthorsNoContact)).toBe(true)
      })

      describe.each(stubs.invalidCoAuthorsEntries)(
        'with invalid entry: %s',
        (invalidCoAuthor) => {
          it('should return error message when pass invalid co-author', () => {
            expect(guard.coAuthors(invalidCoAuthor)).toBe(
              chalk.red(stubs.commitInvalidCoAuthorError)
            )
          })
        }
      )

      it('should return true when all contacts exists', () => {
        expect(guard.coAuthors(stubs.commitCoAuthorsWithValidContacts)).toBe(
          true
        )
      })

      it('should return error message when not found contacts', () => {
        expect(
          guard.coAuthors(
            stubs.clientCommitAnswersWithScopeAndOptions.coAuthors
          )
        ).toBe(chalk.red(stubs.commitContactsNotFoundError))
      })
    })
  })

  describe('prompts', () => {
    it('should register the autoComplete inquirer prompt', () => {
      expect(inquirer.registerPrompt).toHaveBeenCalledWith(
        'autocomplete',
        expect.any(Function)
      )
    })

    describe('without scope prompt', () => {
      it('should match the array of questions', () => {
        expect(prompts(stubs.gitmojis)).toMatchSnapshot()
      })
    })

    describe('with scope prompt', () => {
      beforeAll(() => {
        configurationVault.getScopePrompt.mockReturnValue(true)
      })

      it('should match the array of questions', () => {
        expect(prompts(stubs.gitmojis)).toMatchSnapshot()
      })
    })
  })

  describe('filter', () => {
    it('should match filter', () => {
      expect(filter).toMatchSnapshot()
    })

    describe.each(stubs.coAuthorsInputFiltered)(
      'coAuthors: %s',
      (input, expected) => {
        it(`should return filtered value: ${expected}`, () => {
          expect(filter.coAuthors(input)).toBe(expected)
        })
      }
    )

    describe('refs', () => {
      it('should remove non-numbers, #, ! and multiple spaces', () => {
        expect(filter.refs(stubs.refsFilterInput)).toBe(
          stubs.refsFilterInputFiltered
        )
      })
    })
  })
})
