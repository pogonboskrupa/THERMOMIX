import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { recipesApi } from '../api/client'
import RecipeEditor from '../components/RecipeEditor'

export default function RecipeEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [recipe, setRecipe] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    recipesApi.get(id).then((r) => setRecipe(r.data)).catch(() => {
      toast.error('Recept nije pronađen')
      navigate('/')
    })
  }, [id])

  const handleSubmit = async (data) => {
    setLoading(true)
    try {
      await recipesApi.update(id, data)
      toast.success('Recept uspješno ažuriran!')
      navigate(`/recipes/${id}`)
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Greška pri ažuriranju')
      setLoading(false)
    }
  }

  if (!recipe) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48 mb-6" />
        <div className="h-64 bg-gray-200 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-4 mb-6">
        <Link to={`/recipes/${id}`} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4" /> Natrag
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Uredi recept</h1>
      </div>
      <RecipeEditor initialData={recipe} onSubmit={handleSubmit} isLoading={loading} />
    </div>
  )
}
