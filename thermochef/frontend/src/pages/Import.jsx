import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Link2, Camera, PenLine, Upload, CheckCircle, AlertCircle, Loader, ArrowRight, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { importApi, recipesApi } from '../api/client'
import RecipeEditor from '../components/RecipeEditor'

const tabs = [
  { id: 'url', label: 'URL uvoz', icon: Link2 },
  { id: 'ocr', label: 'Foto/OCR', icon: Camera },
  { id: 'manual', label: 'Ručni unos', icon: PenLine },
]

function URLImport({ onPreview }) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)

  const handleImport = async () => {
    if (!url.trim()) return
    setLoading(true)
    try {
      const res = await importApi.fromUrl(url.trim())
      onPreview(res.data, url)
      toast.success('Recept uspješno dohvaćen!')
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Nije moguće dohvatiti recept s ovog URL-a')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="label">URL recepta</label>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            type="url"
            placeholder="https://www.coolinarika.com/recept/... ili bilo koji drugi site"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleImport()}
          />
          <button onClick={handleImport} disabled={loading || !url.trim()} className="btn-primary whitespace-nowrap">
            {loading ? <Loader className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            {loading ? 'Dohvaćam...' : 'Uvezi'}
          </button>
        </div>
      </div>
      <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-700">
        <p className="font-medium mb-1">Podržane stranice:</p>
        <ul className="list-disc list-inside space-y-1 text-blue-600">
          <li>Coolinarika.com (posebna podrška za HR recepte)</li>
          <li>AllRecipes.com</li>
          <li>Bilo koja stranica s JSON-LD strukturiranim podacima (schema.org/Recipe)</li>
        </ul>
      </div>
    </div>
  )
}

function OCRImport({ onPreview }) {
  const [loading, setLoading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef()

  const handleFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      toast.error('Molimo odaberite sliku (JPEG, PNG, WebP)')
      return
    }
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('save', 'false')
      const res = await importApi.fromImage(formData)
      onPreview(res.data, file.name)
      toast.success('Recept uspješno izvučen iz slike!')
    } catch (e) {
      toast.error(e.response?.data?.detail || 'OCR nije uspio. Provjerite kvalitetu slike.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div
        className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors ${dragOver ? 'border-thermomix-400 bg-thermomix-50' : 'border-gray-300 hover:border-thermomix-300'}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }}
        onClick={() => !loading && fileRef.current.click()}
      >
        {loading ? (
          <>
            <Loader className="w-12 h-12 text-thermomix-400 animate-spin mx-auto mb-3" />
            <p className="text-gray-600 font-medium">Analiziram sliku pomoću Claude AI...</p>
            <p className="text-sm text-gray-400 mt-1">Ovo može potrajati 10-20 sekundi</p>
          </>
        ) : (
          <>
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-700 font-medium">Povucite sliku ovdje ili kliknite za odabir</p>
            <p className="text-sm text-gray-400 mt-1">JPEG, PNG, WebP · max 10MB</p>
          </>
        )}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
      </div>
      <div className="bg-amber-50 rounded-lg p-4 text-sm text-amber-700">
        <p className="font-medium mb-1">Savjeti za bolje rezultate:</p>
        <ul className="list-disc list-inside space-y-1 text-amber-600">
          <li>Koristite jasne, oštro fokusirane fotografije</li>
          <li>Osigurajte dobro osvjetljenje</li>
          <li>Tekst mora biti čitljiv (min. 12pt)</li>
          <li>Screenshotovi digitalnih recepata daju odlične rezultate</li>
        </ul>
      </div>
    </div>
  )
}

export default function Import() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('url')
  const [preview, setPreview] = useState(null)
  const [previewSource, setPreviewSource] = useState('')
  const [saving, setSaving] = useState(false)

  const handlePreview = (data, source) => {
    setPreview(data)
    setPreviewSource(source)
  }

  const handleSave = async (formData) => {
    setSaving(true)
    try {
      const res = await recipesApi.create(formData)
      toast.success('Recept uspješno spremljen!')
      navigate(`/recipes/${res.data.id}`)
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Greška pri spremanju')
      setSaving(false)
    }
  }

  const handleManualSave = async (formData) => {
    setSaving(true)
    try {
      const res = await recipesApi.create(formData)
      toast.success('Recept uspješno kreiran!')
      navigate(`/recipes/${res.data.id}`)
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Greška pri kreiranju')
      setSaving(false)
    }
  }

  if (preview) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pregled uvezenog recepta</h1>
            <p className="text-sm text-gray-500 mt-1">Izvor: {previewSource}</p>
          </div>
          <button onClick={() => setPreview(null)} className="btn-secondary">
            ← Novi uvoz
          </button>
        </div>
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700 text-sm">
          <CheckCircle className="w-4 h-4 shrink-0" />
          Recept je uspješno prepoznat. Pregledajte i uredite podatke, zatim kliknite "Spremi recept".
        </div>
        <RecipeEditor initialData={preview} onSubmit={handleSave} isLoading={saving} />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Uvoz recepta</h1>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-6 w-fit">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === id ? 'bg-white text-thermomix-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="card p-6">
        {activeTab === 'url' && <URLImport onPreview={handlePreview} />}
        {activeTab === 'ocr' && <OCRImport onPreview={handlePreview} />}
        {activeTab === 'manual' && (
          <RecipeEditor onSubmit={handleManualSave} isLoading={saving} />
        )}
      </div>

      {/* Import History link */}
      <div className="mt-6 text-center">
        <a href="/import/history" className="text-sm text-gray-500 hover:text-thermomix-600">
          Pogledaj povijest uvoza →
        </a>
      </div>
    </div>
  )
}
