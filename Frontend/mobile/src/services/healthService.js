import { apiFetch } from './apiClient'

export async function getApiHealth() {
  return apiFetch('/health')
}
