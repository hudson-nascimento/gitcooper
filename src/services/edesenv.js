// @flow
import axios from 'axios'
import axiosCookieJarSupport from 'axios-cookiejar-support'
import tough from 'tough-cookie'
import configurationVault from '../utils/configurationVault'

axios.defaults.baseURL = 'http://edesenv3.coopersystem.com.br/edesenv2'
axiosCookieJarSupport(axios)
const cookieJar = new tough.CookieJar()

const username = configurationVault.getLdapUsername()
const password = configurationVault.getLdapPassword()

export type Allocation = {
  firstEntry: Date,
  firstExit: Date,
  secondEntry: Date,
  secondExit: Date
}

function _calcHours(date: Date) {
  return parseInt(date.getHours()) + parseInt(date.getMinutes()) / 60
}

async function _getAllocationData(): Promise<Allocation> {
  await axios.post(
    'usuarios/login',
    {
      Usuario: {
        username,
        password
      }
    },
    {
      jar: cookieJar,
      withCredentials: true
    }
  )

  const { data } = await axios.get('alocacoes/get_entradas_saidas', {
    jar: cookieJar,
    withCredentials: true
  })

  const [allocationDataString] = data.match(
    /(?<=<div id="content" style="display:none">)\s+(.*?)\s+(?=<\/div>)/gm
  )
  const { ent_aloca_1, sai_aloca_1, ent_aloca_2, sai_aloca_2 } = JSON.parse(
    allocationDataString.trim()
  )

  return {
    firstEntry: ent_aloca_1,
    firstExit: sai_aloca_1,
    secondEntry: ent_aloca_2,
    secondExit: sai_aloca_2
  }
}

function _getIntervalBetween(a: Date, b: Date) {
  return Math.abs(_calcHours(a) - b ? _calcHours(b) : _calcHours(new Date()))
}

export async function getWorkedHoursToday() {
  const {
    firstEntry,
    secondEntry,
    firstExit,
    secondExit
  } = await _getAllocationData()
  if (!firstEntry) {
    throw new Error(
      'You need to start your job to create new spend time registry on Redmine!'
    )
  }

  const firstInterval = _getIntervalBetween(firstEntry, firstExit)
  const secondInterval = secondEntry
    ? _getIntervalBetween(secondEntry, secondExit)
    : null

  return secondInterval ? firstInterval + secondInterval : firstInterval
}
