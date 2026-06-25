import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Grid, List, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { recipesApi } from '../api/client'
import RecipeCard from '../components/RecipeCard'

const DIFFICULTIES = [
  { value: '', label: 'Sve težine' },
  { value: 'easy', label: 'Lako' },
  { value: 'medium', label: 'Srednje' },
  { value: 'hard', label: 'Teško' },
]

export default function Library() {
  const [recipes, setRecipes] = useState([])
  const [tags, setTags] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState('')
  const [viewMode, setViewMode] = useState('grid')

  const fetchRecipes = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (search) params.search = search
      if (tagFilter) params.tag = tagFilter
      if (difficultyFilter) params.difficulty = difficultyFilter
      const res = await recipesApi.list(params)
      setRecipes(res.data)
    } catch {
      toast.error('Greška pri učitavanju recepata')
    } finally {
      setLoading(false)
    }
  }, [search, tagFilter, difficultyFilter])

  useEffect(() => {
    fetchRecipes()
  }, [fetchRecipes])

  useEffect(() => {
    recipesApi.listTags().then((r) => setTags(r.data)).catch(() => {})
  }, [])

  const handleDelete = async (id) => {
    if (!confirm('Obrisati recept?')) return
    try {
      await recipesApi.delete(id)
      setRecipes((prev) => prev.filter((r) => r.id !== id))
      toast.success('Recept obrisan')
    } catch {
      toast.error('Greška pri brisanju')
    }
  }

  const handleDuplicate = async (id) => {
    try {
      const res = await recipesApi.duplicate(id)
      setRecipes((prev) => [res.data, ...prev])
      toast.success('Recept kopiran')
    } catch {
      toast.error('Greška pri kopiranju')
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Moji Recepti</h1>
          <p className="text-gray-500 text-sm mt-1">{recipes.length} recepata u bazi</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/import" className="btn-secondary">
            <Download className="w-4 h-4" /> Uvoz
          </Link>
          <Link to="/recipes/new" className="btn-primary">
            <Plus className="w-4 h-4" /> Novi recept
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Pretraži recepte..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input sm:w-44" value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}>
          <option value="">Sve kategorije</option>
          {tags.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="input sm:w-40" value={difficultyFilter} onChange={(e) => setDifficultyFilter(e.target.value)}>
          {DIFFICULTIES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
        </select>
        <div className="flex rounded-lg border border-gray-300 overflow-hidden">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 ${viewMode === 'grid' ? 'bg-thermomix-50 text-thermomix-600' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 border-l border-gray-300 ${viewMode === 'list' ? 'bg-thermomix-50 text-thermomix-600' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-48 bg-gray-200" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : recipes.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🍳</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Nema recepata</h3>
          <p className="text-gray-500 mb-6">
            {search || tagFilter || difficultyFilter
              ? 'Nema rezultata za odabrane filtere.'
              : 'Dodajte prvi recept uvozom ili ručnim unosom!'}
          </p>
          <Link to="/import" className="btn-primary inline-flex">
            <Plus className="w-4 h-4" /> Dodaj recept
          </Link>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {recipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {recipes.map((recipe) => (
            <div key={recipe.id} className="card p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="w-14 h-14 rounded-lg bg-thermomix-100 overflow-hidden shrink-0">
                {recipe.image_url ? (
                  <img src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none' }} />
                ) : null}
              </div>
              <div className="flex-1 min-w-0">
                <Link to={`/recipes/${recipe.id}`} className="font-medium text-gray-900 hover:text-thermomix-600 line-clamp-1">
                  {recipe.title}
                </Link>
                <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                  <span>{((recipe.prep_time || 0) + (recipe.cook_time || 0))} min</span>
                  <span>·</span>
                  <span>{recipe.servings} por.</span>
                  {recipe.tags?.slice(0, 2).map((t) => (
                    <span key={t.id} className="badge bg-gray-100 text-gray-600">{t.name}</span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Link to={`/recipes/${recipe.id}/edit`} className="btn-secondary py-1 px-2 text-xs">Uredi</Link>
                <button onClick={() => handleDelete(recipe.id)} className="btn-danger py-1 px-2 text-xs">Briši</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
