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
    Cypress.on('uncaught:exception', () => false)

    const username = Cypress.env('username')
    const password = Cypress.env('password')
    const issue = Cypress.env('issue')
    const comment = Cypress.env('comment') ?? ''
    const sandbox = Cypress.env('sandbox') ?? false

    if (!issue) {
      throw new Error('Env var "issue" is required')
    }

    // Login on edesenv to get total worked hours in day
    cy.loginEdesenv(username, password)

    cy.get('#content_checkin')
      .invoke('text')
      .then((text) => {
        const totalWorkedHours = getTotalWorkedHours(text)

        cy.log('Total worked', totalWorkedHours)

        // Login on redmine
        cy.loginRedmine(username, password)

        cy.findRegisteredWorkedHours().then((text) => {
          const [registeredWorkedHours] = text.match(/[0-9]{1,2}.[0-9]{1,2}/gm)

          cy.log('totalWorkedHours', totalWorkedHours)
          cy.log('registeredWorkedHours', registeredWorkedHours)

          // Get last task worked hours
          const issueWorkedHours = totalWorkedHours - registeredWorkedHours

          cy.newTimeEntry(issue, issueWorkedHours, comment)
        })
      })
  })
})
