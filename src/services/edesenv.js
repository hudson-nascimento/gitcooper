// @flow
import axios from 'axios'
import axiosCookieJarSupport from 'axios-cookiejar-support'
import tough from 'tough-cookie'
import configurationVault from '../utils/configurationVault'

axiosCookieJarSupport(axios)
const cookieJar = new tough.CookieJar()

const username = configurationVault.getLdapUsername()
const password = configurationVault.getLdapPassword()

export type Allocation = {
  firstEntry: string,
  firstExit: string,
  secondEntry: string,
  secondExit: string
}

async function _getAllocationData(): Promise<Allocation> {
  await axios.post(
    'http://edesenv3.coopersystem.com.br/edesenv2/usuarios/login',
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

  const { data } = await axios.get(
    'http://edesenv3.coopersystem.com.br/edesenv2/alocacoes/get_entradas_saidas',
    {
      jar: cookieJar,
      withCredentials: true
    }
  )

  const [allocationDataString] = data.match(
    /(?<=<div id="content" style="display:none">)\s+(.*?)\s+(?=<\/div>)/gm
  )
  const {
    Alocacao: { hh_entrada_1, hh_entrada_2, hh_sai_1, hh_sai_2 }
  } = JSON.parse(allocationDataString.trim())

  return {
    firstEntry: hh_entrada_1,
    firstExit: hh_sai_1,
    secondEntry: hh_entrada_2,
    secondExit: hh_sai_2
  }
}

function _timeToHours(time: string) {
  const [hours, minutes] = time.split(':')

  return parseInt(hours) + parseInt(minutes) / 60
}

export async function getWorkedHoursToday() {
  let {
    firstEntry,
    firstExit,
    secondEntry,
    secondExit
  } = await _getAllocationData()
  if (!firstEntry) {
    throw new Error(
      'You need to start your job to create new spend time registry on Redmine!'
    )
  }

  const now = new Date()
  const hoursAndMinutes = `${now.getHours()}:${now.getMinutes()}}`

  firstEntry = _timeToHours(firstEntry)
  firstExit = _timeToHours(firstExit ?? hoursAndMinutes)

  const firstInterval = Math.abs(firstEntry - firstExit)

  let secondInterval
  secondEntry = secondEntry ? _timeToHours(secondEntry) : null
  if (secondEntry) {
    secondExit = _timeToHours(secondExit ?? hoursAndMinutes)
    secondInterval = Math.abs(secondEntry - secondExit)
  }

  return secondInterval ? firstInterval + secondInterval : firstInterval
}
