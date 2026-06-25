import { Link } from 'react-router-dom'
import { Clock, Users, ChefHat, CheckCircle, AlertCircle, RefreshCw, Minus } from 'lucide-react'

const difficultyLabels = { easy: 'Lako', medium: 'Srednje', hard: 'Teško' }
const difficultyColors = {
  easy: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  hard: 'bg-red-100 text-red-700',
}

const syncStatusIcon = {
  synced: <CheckCircle className="w-3.5 h-3.5 text-green-500" />,
  pending: <RefreshCw className="w-3.5 h-3.5 text-yellow-500" />,
  error: <AlertCircle className="w-3.5 h-3.5 text-red-500" />,
  not_synced: <Minus className="w-3.5 h-3.5 text-gray-400" />,
}

const syncStatusLabel = {
  synced: 'Synced',
  pending: 'Na čekanju',
  error: 'Greška',
  not_synced: 'Nije sinkronizirano',
}

export default function RecipeCard({ recipe, onDelete, onDuplicate, onSync }) {
  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0)

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
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 text-xs">
            {syncStatusIcon[recipe.cookidoo_sync_status] || syncStatusIcon.not_synced}
            <span className="text-gray-600">{syncStatusLabel[recipe.cookidoo_sync_status] || 'Nije sinkronizirano'}</span>
          </div>
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
              <span key={tag.id} className="badge bg-gray-100 text-gray-600">
                {tag.name}
              </span>
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
            onClick={() => onSync(recipe.id)}
            className="flex-1 text-center text-xs text-gray-600 hover:text-green-600 py-1 rounded hover:bg-green-50 transition-colors"
          >
            Sync
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
