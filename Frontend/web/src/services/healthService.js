import { graphqlRequest } from './apiClient'

const API_HEALTH_QUERY = `
  query ApiHealth {
    __typename
  }
`

export async function getApiHealth() {
  const data = await graphqlRequest({ query: API_HEALTH_QUERY })
  return {
    ok: data?.__typename === 'Query',
    transport: 'graphql',
  }
}
