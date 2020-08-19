/// <reference types="cypress" />

function timeToHours(time) {
  const [hours, minutes] = time.split(':')

  return parseInt(hours) + parseInt(minutes) / 60
}

function getTotalWorkedHours(text) {
  const times = text.match(/[0-9]{2}:[0-9]{2}/gm)
  if (!times) {
    throw new Error(
      'You need to start your job to create new spend time registry on Redmine!'
    )
  }

  let [first, second, third, fourth] = text.match(/[0-9]{2}:[0-9]{2}/gm)

  const now = new Date()
  const hoursAndMinutes = `${now.getHours()}:${now.getMinutes()}}`

  first = first ? timeToHours(first) : null
  second = timeToHours(second ?? hoursAndMinutes)

  const firstInterval = Math.abs(first - second)

  let secondInterval
  third = third ? timeToHours(third) : null
  if (third) {
    fourth = timeToHours(fourth ?? hoursAndMinutes)
    secondInterval = Math.abs(third - fourth)
  }

  return secondInterval ? firstInterval + secondInterval : firstInterval
}

context('Actions', () => {
  it('Create a new spend time in specific Redmine issue', () => {
    const username = Cypress.env('username')
    const password = Cypress.env('password')
    const issue = Cypress.env('issue')
    const comment = Cypress.env('comment') ?? ''
    const sandbox = Cypress.env('sandbox') ?? false

    if (!issue) {
      throw new Error('Env var "issue" is required')
    }

    // Login on edesenv to get total worked hours in day
    cy.visit('http://edesenv3.coopersystem.com.br/edesenv2/')
    cy.get('#username').type(username)
    cy.get('#password').type(password)
    cy.get('#login-submit').click()

    cy.get('#content_checkin')
      .invoke('text')
      .then((text) => {
        const totalWorkedHours = getTotalWorkedHours(text)

        cy.log('Total worked', totalWorkedHours)

        // Login on redmine
        cy.visit('http://redmine.coopersystem.com.br/login')
        cy.get('#username').type(username)
        cy.get('#password').type(password)
        cy.get('#login-submit').click()

        // Extract worked hours registered on day
        cy.visit(
          'http://redmine.coopersystem.com.br/projects/poppy-cofrinho-online/time_entries?set_filter=1&sort=spent_on:desc&f[]=spent_on&op[spent_on]=t&f[]=user_id&op[user_id]=%3D&v[user_id][]=me&c[]=spent_on&c[]=user&c[]=activity&c[]=issue&c[]=comments&c[]=hours&t[]=hours'
        )
        cy.get('body').then(($body) => {
          if ($body.find('.total-for-hours .value').length > 0) {
            cy.log('Has no hours registered')

            cy.get('.total-for-hours .value')
              .invoke('text')
              .then((text) => {
                const registeredWorkedHours = text.trim()

                cy.log('totalWorkedHours', totalWorkedHours)
                cy.log('registeredWorkedHours', registeredWorkedHours)

                // Get last task worked hours
                const issueWorkedHours =
                  totalWorkedHours - registeredWorkedHours

                cy.visit(
                  `http://redmine.coopersystem.com.br/issues/${issue}/time_entries/new`
                )
                cy.get('#time_entry_hours').type(issueWorkedHours.toFixed(2))

                if (typeof comment === 'string' && comment.trim().length) {
                  cy.get('#time_entry_comments').type(comment.trim())
                }

                // CAUTION: It'll really create a new registry on redmine!!!
                // cy.get('input[name="commit"]').click()
              })
          } else {
            cy.log('Has no hours registered')

            // TODO: Avoid duplicated code
            cy.visit(
              `http://redmine.coopersystem.com.br/issues/${issue}/time_entries/new`
            )
            cy.get('#time_entry_hours').type(totalWorkedHours.toFixed(2))

            if (typeof comment === 'string' && comment.trim().length) {
              cy.get('#time_entry_comments').type(comment.trim())
            }

            // CAUTION: It'll really create a new registry on redmine!!!
            // cy.get('input[name="commit"]').click()
          }
        })
      })
  })
})
