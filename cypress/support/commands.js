Cypress.Commands.add('loginRedmine', (username, password) => {
  cy.visit('http://redmine.coopersystem.com.br/login')
  cy.get('#username').type(username)
  cy.get('#password').type(password)
  cy.get('#login-submit').click()
})

Cypress.Commands.add('loginEdesenv', (username, password) => {
  cy.visit('http://edesenv3.coopersystem.com.br/edesenv2/')
  cy.get('#username').type(username)
  cy.get('#password').type(password)
  cy.get('#login-submit').click()
})

Cypress.Commands.add('_newTimeEntry', (issue, hours, comment, sandbox) => {
  cy.visit(
    `http://redmine.coopersystem.com.br/issues/${issue}/time_entries/new`
  )
  cy.get('#time_entry_hours').type(hours.toFixed(2))

  if (typeof comment === 'string' && comment.trim().length) {
    cy.get('#time_entry_comments').type(comment.trim())
  }

  cy.log('Sand box', sandbox)
  if (!sandbox) {
    cy.get('input[name="commit"]').click()
  }
})

Cypress.Commands.add('findLastUpdatedIssuesInExecution', () => {
  cy.visit(
    'http://redmine.coopersystem.com.br/issues?utf8=%E2%9C%93&set_filter=1&sort=updated_on%3Adesc&f%5B%5D=status_id&op%5Bstatus_id%5D=%3D&v%5Bstatus_id%5D%5B%5D=3&f%5B%5D=assigned_to_id&op%5Bassigned_to_id%5D=%3D&v%5Bassigned_to_id%5D%5B%5D=me&f%5B%5D=&c%5B%5D=project&c%5B%5D=cf_6&c%5B%5D=parent&c%5B%5D=subject&c%5B%5D=status&c%5B%5D=updated_on&group_by=&t%5B%5D='
  )
  cy.get('body').then(($body) => {
    if ($body.find('.nodata').length > 0) {
      throw new Error(
        'Issue not defined and has no one issue in execution! Use the param --refs or put an issue in execution.'
      )
    }
  })

  cy.get('.id:first').invoke('text')
})

Cypress.Commands.add('newTimeEntry', (issue, hours, comment, sandbox) => {
  if (!issue) {
    cy.findLastUpdatedIssuesInExecution().then(
      (lastUpdatedIssueInExecution) => {
        cy._newTimeEntry(lastUpdatedIssueInExecution, hours, comment, sandbox)
      }
    )
  } else {
    cy._newTimeEntry(issue, hours, comment, sandbox)
  }
})

Cypress.Commands.add('findRegisteredWorkedHours', () => {
  cy.server()
  cy.route('POST', 'http://redmine.coopersystem.com.br/spent_time/report').as(
    'search'
  )

  // Extract worked hours registered on day
  cy.visit('http://redmine.coopersystem.com.br/spent_time')
  cy.get('span[aria-labelledby=select2-period-container]').click()
  cy.get('.select2-search__field').type('hoje{enter}')
  cy.get('#form_query')
    .submit()
    .as('submit')

  cy.wait('@search')

  cy.get('.total-hours').invoke('text')
})
