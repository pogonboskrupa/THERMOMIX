import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  Clock, Users, ChefHat, ArrowLeft, Edit, Trash2, Copy, Download,
  Thermometer, Zap, Timer, Wrench, Printer
} from 'lucide-react'
import toast from 'react-hot-toast'
import { recipesApi, cookidooApi } from '../api/client'

const difficultyLabel = { easy: 'Lako', medium: 'Srednje', hard: 'Teško' }
const difficultyColor = { easy: 'text-green-600', medium: 'text-yellow-600', hard: 'text-red-600' }

function formatDuration(secs) {
  if (!secs) return null
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m > 0 ? `${m} min ` : ''}${s > 0 ? `${s} s` : ''}`.trim()
}

export default function RecipeDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [recipe, setRecipe] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    recipesApi.get(id).then((r) => {
      setRecipe(r.data)
      setLoading(false)
    }).catch(() => {
      toast.error('Recept nije pronađen')
      navigate('/')
    })
  }, [id])

  const handleDelete = async () => {
    if (!confirm('Obrisati ovaj recept?')) return
    await recipesApi.delete(id)
    toast.success('Recept obrisan')
    navigate('/')
  }

  const handleDuplicate = async () => {
    const res = await recipesApi.duplicate(id)
    toast.success('Recept kopiran')
    navigate(`/recipes/${res.data.id}`)
  }

  const handleExportZip = async () => {
    try {
      const res = await cookidooApi.exportZip(id)
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `${recipe.slug}.zip`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch {
      toast.error('Greška pri izvozu')
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse">
        <div className="h-64 bg-gray-200 rounded-xl mb-6" />
        <div className="h-8 bg-gray-200 rounded w-1/2 mb-4" />
        <div className="h-4 bg-gray-200 rounded w-3/4" />
      </div>
    )
  }

  if (!recipe) return null

  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0)

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back + Actions */}
      <div className="flex items-center justify-between mb-6 no-print">
        <Link to="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4" /> Natrag
        </Link>
        <div className="flex items-center gap-2">
          <button onClick={() => window.print()} className="btn-secondary">
            <Printer className="w-4 h-4" /> Print
          </button>
          <button onClick={handleExportZip} className="btn-secondary">
            <Download className="w-4 h-4" /> Cookidoo ZIP
          </button>
          <button onClick={handleDuplicate} className="btn-secondary">
            <Copy className="w-4 h-4" /> Kopiraj
          </button>
          <Link to={`/recipes/${id}/edit`} className="btn-primary">
            <Edit className="w-4 h-4" /> Uredi
          </Link>
          <button onClick={handleDelete} className="btn-danger">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hero Image */}
      {recipe.image_url && (
        <div className="rounded-xl overflow-hidden mb-6 h-64 sm:h-80">
          <img src={recipe.image_url} alt={recipe.title} className="w-full h-full object-cover" />
        </div>
      )}

      {/* Title & Meta */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 mb-2">
          <h1 className="text-3xl font-bold text-gray-900">{recipe.title}</h1>
        </div>
        {recipe.description && <p className="text-gray-600 mt-2">{recipe.description}</p>}

        <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-gray-600">
          {totalTime > 0 && (
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-thermomix-500" />
              {totalTime} minuta ukupno
            </span>
          )}
          {recipe.prep_time > 0 && (
            <span className="flex items-center gap-1.5">
              <Timer className="w-4 h-4 text-blue-400" />
              Priprema: {recipe.prep_time} min
            </span>
          )}
          {recipe.cook_time > 0 && (
            <span className="flex items-center gap-1.5">
              <Thermometer className="w-4 h-4 text-red-400" />
              Kuhanje: {recipe.cook_time} min
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-green-500" />
            {recipe.servings} porcija
          </span>
          <span className={`font-medium ${difficultyColor[recipe.difficulty] || 'text-gray-600'}`}>
            {difficultyLabel[recipe.difficulty] || recipe.difficulty}
          </span>
        </div>

        {recipe.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {recipe.tags.map((tag) => (
              <span key={tag.id} className="badge bg-thermomix-50 text-thermomix-700">{tag.name}</span>
            ))}
          </div>
        )}

        {recipe.source_url && (
          <a href={recipe.source_url} target="_blank" rel="noopener noreferrer"
            className="text-xs text-blue-500 hover:underline mt-2 inline-block">
            Izvor recepta ↗
          </a>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
        {/* Ingredients */}
        <div className="md:col-span-2">
          <div className="card p-5 sticky top-24">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ChefHat className="w-4 h-4 text-thermomix-500" />
              Sastojci
              <span className="text-sm font-normal text-gray-400">({recipe.ingredients.length})</span>
            </h2>
            {recipe.ingredients.length === 0 ? (
              <p className="text-gray-400 text-sm">Nema unesenih sastojaka.</p>
            ) : (
              <ul className="space-y-2">
                {recipe.ingredients.map((ing) => (
                  <li key={ing.id} className="flex items-start gap-2 py-1.5 border-b border-gray-100 last:border-0">
                    <div className="w-2 h-2 rounded-full bg-thermomix-400 mt-1.5 shrink-0" />
                    <div className="text-sm">
                      <span className="font-medium text-gray-800">
                        {ing.quantity && `${ing.quantity} `}
                        {ing.unit && `${ing.unit} `}
                      </span>
                      <span className="text-gray-700">{ing.name}</span>
                      {ing.preparation_note && (
                        <span className="text-gray-400">, {ing.preparation_note}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Steps */}
        <div className="md:col-span-3">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-thermomix-500" />
            Koraci pripreme
          </h2>
          {recipe.steps.length === 0 ? (
            <p className="text-gray-400 text-sm">Nema unesenih koraka.</p>
          ) : (
            <ol className="space-y-4">
              {recipe.steps.map((step, idx) => (
                <li key={step.id} className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-thermomix-600 text-white text-sm font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-800 mb-2">{step.instruction}</p>
                    {(step.temperature || step.speed || step.duration_seconds || step.accessory) && (
                      <div className="flex flex-wrap gap-2">
                        {step.temperature && (
                          <span className="badge bg-red-50 text-red-700 flex items-center gap-1">
                            <Thermometer className="w-3 h-3" /> {step.temperature}°C
                          </span>
                        )}
                        {step.speed && (
                          <span className="badge bg-blue-50 text-blue-700 flex items-center gap-1">
                            <Zap className="w-3 h-3" /> Brzina {step.speed}
                          </span>
                        )}
                        {step.duration_seconds && (
                          <span className="badge bg-green-50 text-green-700 flex items-center gap-1">
                            <Timer className="w-3 h-3" /> {formatDuration(step.duration_seconds)}
                          </span>
                        )}
                        {step.accessory && (
                          <span className="badge bg-purple-50 text-purple-700 flex items-center gap-1">
                            <Wrench className="w-3 h-3" /> {step.accessory}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  )
}
