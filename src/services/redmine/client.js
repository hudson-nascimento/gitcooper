import { RedmineClient } from '@smartinsf/redmine-client'
import configurationVault from '../../utils/configurationVault'

const username = configurationVault.getLdapUsername()
const password = configurationVault.getLdapPassword()

const redmine = new RedmineClient('http://redmine.coopersystem.com.br', {
  username,
  password
})

export default redmine
