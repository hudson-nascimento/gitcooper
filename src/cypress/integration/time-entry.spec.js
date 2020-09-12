/// <reference types="cypress" />
import format from 'date-fns/format'

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
    Cypress.on('uncaught:exception', () => false)

    const username = Cypress.env('username')
    const password = Cypress.env('password')
    const issue = Cypress.env('issue')
    const comments = Cypress.env('comment') ?? ''
    const sandbox = Cypress.env('sandbox') ?? false

    cy.log('Running in sandbox', sandbox)

    // Login on edesenv to get total worked hours in day
    cy.loginEdesenv(username, password)

    cy.get('#content_checkin')
      .invoke('text')
      .then((text) => {
        const totalWorkedHours = getTotalWorkedHours(text)

        cy.log('Total worked', totalWorkedHours)

        // Login on redmine
        cy.loginRedmine(username, password)

        const today = format(new Date(), 'yyyy-MM-d')

        cy.request({
          method: 'GET',
          url: `http://redmine.coopersystem.com.br/time_entries.json`,
          auth: {
            username,
            password
          },
          qs: {
            user_id: 'me',
            from: today,
            to: today,
            limit: 100
          }
        }).then((response) => {
          const registeredWorkedHours = response.body.time_entries.reduce(
            (n, { hours }) => n + hours,
            0
          )

          cy.log('totalWorkedHours', totalWorkedHours)
          cy.log('registeredWorkedHours', registeredWorkedHours)

          const issueWorkedHours = totalWorkedHours - registeredWorkedHours

          cy.log('issueWorkedHours', issueWorkedHours)

          if (issueWorkedHours.toFixed(2) == 0.0) {
            throw new Error("It's over for today! See you tomorrow ;)")
          }

          if (!sandbox) {
            cy.request({
              method: 'POST',
              url: `http://redmine.coopersystem.com.br/time_entries.json`,
              auth: {
                username,
                password
              },
              body: {
                time_entry: {
                  issue_id: issue,
                  hours: issueWorkedHours,
                  comments: comments,
                  spent_on: today
                }
              }
            }).then((response) => {
              expect(response.body).to.have.property('time_entry')
            })
          } else {
            cy.log(`Create time entry for issue ${issue}!`)
          }
        })
      })
  })
})
