import { ApiError, createRequestClient, toQuery } from '../../../shared/request.js'

const defaultBaseURL = import.meta.env.DEV ? 'http://127.0.0.1:4173/api' : ''
const client = createRequestClient({
  baseURL: import.meta.env.VITE_API_BASE_URL || defaultBaseURL,
  tokenKey: 'coffee_web_token',
  userKey: 'coffee_web_user',
})

export { ApiError, toQuery }
export const request = client.request
export const api = client.api
