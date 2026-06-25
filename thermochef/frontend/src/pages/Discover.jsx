import { useState } from 'react'
import { Clock, Users, ChefHat, Plus, Check, Loader } from 'lucide-react'
import toast from 'react-hot-toast'
import { recipesApi } from '../api/client'
import { CUISINES, FEATURED_RECIPES } from '../data/featuredRecipes'

const difficultyLabels = { easy: 'Lako', medium: 'Srednje', hard: 'Teško' }
const difficultyColors = {
  easy: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  hard: 'bg-red-100 text-red-700',
}

function RecipeTile({ recipe }) {
  const [state, setState] = useState('idle') // idle | loading | done
  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0)

  const handleAdd = async () => {
    if (state !== 'idle') return
    setState('loading')
    try {
      const { _cuisine, ...payload } = recipe
      await recipesApi.create(payload)
      setState('done')
      toast.success(`"${recipe.title}" dodan u zbirku!`)
    } catch {
      setState('idle')
      toast.error('Greška pri dodavanju recepta')
    }
  }

  return (
    <div className="card hover:shadow-md transition-shadow duration-200 flex flex-col">
      <div className="relative h-36 bg-gradient-to-br from-thermomix-100 to-thermomix-200 flex items-center justify-center">
        <ChefHat className="w-12 h-12 text-thermomix-300" />
        {state === 'done' && (
          <div className="absolute inset-0 bg-thermomix-600/80 flex items-center justify-center rounded-t-lg">
            <Check className="w-10 h-10 text-white" />
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2 text-sm">{recipe.title}</h3>
        {recipe.description && (
          <p className="text-gray-500 text-xs mb-3 line-clamp-2 flex-1">{recipe.description}</p>
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
          <span className={`badge ${difficultyColors[recipe.difficulty]}`}>
            {difficultyLabels[recipe.difficulty]}
          </span>
        </div>

        <button
          onClick={handleAdd}
          disabled={state !== 'idle'}
          className={`w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs font-medium transition-colors ${
            state === 'done'
              ? 'bg-green-100 text-green-700 cursor-default'
              : 'bg-thermomix-600 hover:bg-thermomix-700 text-white'
          }`}
        >
          {state === 'loading' && <Loader className="w-3.5 h-3.5 animate-spin" />}
          {state === 'done' && <Check className="w-3.5 h-3.5" />}
          {state === 'idle' && <Plus className="w-3.5 h-3.5" />}
          {state === 'done' ? 'Dodano!' : 'Dodaj u zbirku'}
        </button>
      </div>
    </div>
  )
}

export default function Discover() {
  const [activeCuisine, setActiveCuisine] = useState('bosanska')

  const filtered = FEATURED_RECIPES.filter((r) => r._cuisine === activeCuisine)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Otkrijte recepte</h1>
        <p className="text-gray-500 text-sm mt-1">
          Odaberite kuhinju, pregledajte recepte i dodajte ih u svoju zbirku jednim klikom.
        </p>
      </div>

      {/* Cuisine tabs */}
      <div className="flex flex-wrap gap-2 mb-8">
        {CUISINES.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveCuisine(c.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
              activeCuisine === c.id
                ? 'bg-thermomix-600 text-white border-thermomix-600'
                : 'bg-white text-gray-600 border-gray-300 hover:border-thermomix-400 hover:text-thermomix-600'
            }`}
          >
            <span>{c.emoji}</span>
            {c.label}
          </button>
        ))}
      </div>

      {/* Recipe grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((recipe) => (
          <RecipeTile key={recipe.title} recipe={recipe} />
        ))}
      </div>
    </div>
  )
}
