import api from './api'

export async function getRegisteredWorkedHours() {
  const { data } = await api.get('time_entries.json', {
    params: {
      user_id: 'me',
      from: today,
      to: today,
      limit: 100
    }
  })

  return data.time_entries.reduce((n, { hours }) => n + hours, 0)
}

export async function createTimeEntry(
  issue: number,
  hours: number,
  comments = ''
) {
  const response = await api.post('time_entries.json', {
    time_entry: {
      issue_id: issue,
      hours,
      comments,
      spent_on: today
    }
  })

  return response.status === 201
}
