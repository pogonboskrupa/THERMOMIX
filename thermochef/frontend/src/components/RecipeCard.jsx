import { Link } from 'react-router-dom'
import { Clock, Users, ChefHat, Download, Loader } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { cookidooApi } from '../api/client'

const difficultyLabels = { easy: 'Lako', medium: 'Srednje', hard: 'Teško' }
const difficultyColors = {
  easy: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  hard: 'bg-red-100 text-red-700',
}

export default function RecipeCard({ recipe, onDelete, onDuplicate }) {
  const [exporting, setExporting] = useState(false)
  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0)

  const handleExportZip = async (e) => {
    e.preventDefault()
    setExporting(true)
    try {
      const res = await cookidooApi.exportZip(recipe.id)
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `${recipe.slug || recipe.id}.zip`
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('ZIP preuzet — uvezi ga u Cookidoo → Moji recepti')
    } catch {
      toast.error('Greška pri izvozu')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="card hover:shadow-md transition-shadow duration-200 group">
      <Link to={`/recipes/${recipe.id}`}>
        <div className="relative h-48 bg-gradient-to-br from-thermomix-100 to-thermomix-200 overflow-hidden">
          {recipe.image_url ? (
            <img
              src={recipe.image_url}
              alt={recipe.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) => { e.target.style.display = 'none' }}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <ChefHat className="w-16 h-16 text-thermomix-300" />
            </div>
          )}
        </div>
      </Link>

      <div className="p-4">
        <Link to={`/recipes/${recipe.id}`}>
          <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2 hover:text-thermomix-600 transition-colors">
            {recipe.title}
          </h3>
        </Link>

        {recipe.description && (
          <p className="text-gray-500 text-sm mb-3 line-clamp-2">{recipe.description}</p>
        )}

        <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
          {totalTime > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {totalTime} min
            </span>
          )}
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            {recipe.servings} por.
          </span>
          <span className={`badge ${difficultyColors[recipe.difficulty] || difficultyColors.medium}`}>
            {difficultyLabels[recipe.difficulty] || recipe.difficulty}
          </span>
        </div>

        {recipe.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {recipe.tags.slice(0, 3).map((tag) => (
              <span key={tag.id} className="badge bg-gray-100 text-gray-600">{tag.name}</span>
            ))}
            {recipe.tags.length > 3 && (
              <span className="badge bg-gray-100 text-gray-400">+{recipe.tags.length - 3}</span>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
          <Link
            to={`/recipes/${recipe.id}/edit`}
            className="flex-1 text-center text-xs text-gray-600 hover:text-thermomix-600 py-1 rounded hover:bg-thermomix-50 transition-colors"
          >
            Uredi
          </Link>
          <button
            onClick={() => onDuplicate(recipe.id)}
            className="flex-1 text-center text-xs text-gray-600 hover:text-thermomix-600 py-1 rounded hover:bg-thermomix-50 transition-colors"
          >
            Kopiraj
          </button>
          <button
            onClick={handleExportZip}
            disabled={exporting}
            className="flex-1 text-center text-xs text-thermomix-600 hover:text-thermomix-800 py-1 rounded hover:bg-thermomix-50 transition-colors flex items-center justify-center gap-1"
          >
            {exporting ? <Loader className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
            Cookidoo
          </button>
          <button
            onClick={() => onDelete(recipe.id)}
            className="flex-1 text-center text-xs text-red-500 hover:text-red-700 py-1 rounded hover:bg-red-50 transition-colors"
          >
            Izbriši
          </button>
        </div>
      </div>
    </div>
  )
}
