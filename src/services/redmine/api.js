import api from 'axios'
import configurationVault from '../utils/configurationVault'

const username = configurationVault.getLdapUsername()
const password = configurationVault.getLdapPassword()

api.defaults.baseURL = `http://${username}:${password}@redmine.coopersystem.com.br`

export default api
