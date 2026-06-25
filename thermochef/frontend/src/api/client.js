import axios from 'axios'

export const DEFAULT_API_URL = 'http://localhost:8000'
export const API_URL_KEY = 'thermochef_api_url'

export function getApiUrl() {
  return localStorage.getItem(API_URL_KEY) || DEFAULT_API_URL
}

export function setApiUrl(url) {
  localStorage.setItem(API_URL_KEY, url.replace(/\/$/, ''))
}

// Create axios instance that reads the base URL dynamically on every request
const api = axios.create()

api.interceptors.request.use((config) => {
  config.baseURL = getApiUrl()
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (!err.response && err.code === 'ERR_NETWORK') {
      console.debug('ThermoChef: backend not reachable at', getApiUrl())
    }
    return Promise.reject(err)
  }
)

// Recipes
export const recipesApi = {
  list: (params = {}) => api.get('/api/recipes/', { params }),
  get: (id) => api.get(`/api/recipes/${id}`),
  getBySlug: (slug) => api.get(`/api/recipes/slug/${slug}`),
  create: (data) => api.post('/api/recipes/', data),
  update: (id, data) => api.put(`/api/recipes/${id}`, data),
  delete: (id) => api.delete(`/api/recipes/${id}`),
  duplicate: (id) => api.post(`/api/recipes/${id}/duplicate`),
  listTags: () => api.get('/api/recipes/tags'),
}

// Import
export const importApi = {
  fromUrl: (url, save = false) => api.post('/api/import/url', { url, save }),
  fromImage: (formData) =>
    api.post('/api/import/ocr', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  history: () => api.get('/api/import/history'),
}

// Cookidoo
export const cookidooApi = {
  auth: (data) => api.post('/api/cookidoo/auth', data),
  status: () => api.get('/api/cookidoo/status'),
  logout: () => api.post('/api/cookidoo/logout'),
  syncOne: (recipeId) => api.post(`/api/cookidoo/sync/${recipeId}`),
  syncBulk: (recipeIds = null) =>
    api.post('/api/cookidoo/sync-bulk', { recipe_ids: recipeIds }),
  exportZip: (recipeId) =>
    api.get(`/api/cookidoo/export/${recipeId}`, { responseType: 'blob' }),
  tokenInfo: () => api.get('/api/cookidoo/tokens'),
}

// Settings
export const settingsApi = {
  getAll: () => api.get('/api/settings/'),
  update: (key, value) => api.put(`/api/settings/${key}`, { value }),
  exportDb: () =>
    api.get('/api/settings/export/json', { responseType: 'blob' }),
}

export default api
