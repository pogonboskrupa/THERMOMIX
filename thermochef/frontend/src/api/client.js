import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Recipes
export const recipesApi = {
  list: (params = {}) => api.get('/recipes/', { params }),
  get: (id) => api.get(`/recipes/${id}`),
  getBySlug: (slug) => api.get(`/recipes/slug/${slug}`),
  create: (data) => api.post('/recipes/', data),
  update: (id, data) => api.put(`/recipes/${id}`, data),
  delete: (id) => api.delete(`/recipes/${id}`),
  duplicate: (id) => api.post(`/recipes/${id}/duplicate`),
  listTags: () => api.get('/recipes/tags'),
}

// Import
export const importApi = {
  fromUrl: (url, save = false) => api.post('/import/url', { url, save }),
  fromImage: (formData) =>
    api.post('/import/ocr', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  history: () => api.get('/import/history'),
}

// Cookidoo
export const cookidooApi = {
  auth: (data) => api.post('/cookidoo/auth', data),
  status: () => api.get('/cookidoo/status'),
  logout: () => api.post('/cookidoo/logout'),
  syncOne: (recipeId) => api.post(`/cookidoo/sync/${recipeId}`),
  syncBulk: (recipeIds = null) => api.post('/cookidoo/sync-bulk', { recipe_ids: recipeIds }),
  exportZip: (recipeId) =>
    api.get(`/cookidoo/export/${recipeId}`, { responseType: 'blob' }),
  tokenInfo: () => api.get('/cookidoo/tokens'),
}

// Settings
export const settingsApi = {
  getAll: () => api.get('/settings/'),
  update: (key, value) => api.put(`/settings/${key}`, { value }),
  exportDb: () => api.get('/settings/export/json', { responseType: 'blob' }),
}

export default api
