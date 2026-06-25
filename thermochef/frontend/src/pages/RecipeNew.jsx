import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { recipesApi } from '../api/client'
import RecipeEditor from '../components/RecipeEditor'

export default function RecipeNew() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (data) => {
    setLoading(true)
    try {
      const res = await recipesApi.create(data)
      toast.success('Recept uspješno kreiran!')
      navigate(`/recipes/${res.data.id}`)
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Greška pri kreiranju recepta')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4" /> Natrag
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Novi recept</h1>
      </div>
      <RecipeEditor onSubmit={handleSubmit} isLoading={loading} />
    </div>
  )
}
