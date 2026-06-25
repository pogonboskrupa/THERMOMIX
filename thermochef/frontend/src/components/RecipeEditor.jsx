import { useState } from 'react'
import { Plus, Trash2, GripVertical, ChevronDown } from 'lucide-react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const TEMPERATURES = ['', '37', '50', '60', '70', '80', '90', '100', '110', '120', 'Varoma']
const SPEEDS = ['', '0.5', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'Turbo', 'Reverse']
const ACCESSORIES = ['', 'Butterfly', 'Simmering basket', 'Spatula', 'Varoma']
const DIFFICULTIES = [
  { value: 'easy', label: 'Lako' },
  { value: 'medium', label: 'Srednje' },
  { value: 'hard', label: 'Teško' },
]
const LANGUAGES = [
  { value: 'hr', label: 'Hrvatski' },
  { value: 'en', label: 'English' },
  { value: 'de', label: 'Deutsch' },
]
const UNITS = ['', 'g', 'dag', 'kg', 'ml', 'dl', 'l', 'kom', 'žlica', 'žličica', 'šalica', 'prstohvat', 'tbsp', 'tsp', 'cup', 'oz']

function SortableIngredient({ ingredient, idx, onChange, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: `ing-${idx}` })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200 mb-2">
      <button {...attributes} {...listeners} className="mt-2 cursor-grab text-gray-400 hover:text-gray-600">
        <GripVertical className="w-4 h-4" />
      </button>
      <div className="flex-1 grid grid-cols-12 gap-2">
        <input
          className="input col-span-2"
          placeholder="Kol."
          value={ingredient.quantity}
          onChange={(e) => onChange(idx, 'quantity', e.target.value)}
        />
        <select
          className="input col-span-2"
          value={ingredient.unit}
          onChange={(e) => onChange(idx, 'unit', e.target.value)}
        >
          {UNITS.map((u) => <option key={u} value={u}>{u || '—'}</option>)}
        </select>
        <input
          className="input col-span-4"
          placeholder="Naziv sastojka *"
          value={ingredient.name}
          onChange={(e) => onChange(idx, 'name', e.target.value)}
          required
        />
        <input
          className="input col-span-4"
          placeholder="Priprema (npr. naribano)"
          value={ingredient.preparation_note}
          onChange={(e) => onChange(idx, 'preparation_note', e.target.value)}
        />
      </div>
      <button onClick={() => onRemove(idx)} className="mt-2 text-red-400 hover:text-red-600">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}

function SortableStep({ step, idx, onChange, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: `step-${idx}` })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const [showThermo, setShowThermo] = useState(
    !!(step.temperature || step.speed || step.duration_seconds || step.accessory)
  )

  const durationToString = (secs) => {
    if (!secs) return ''
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const parseDuration = (str) => {
    if (!str) return null
    const [m, s] = str.split(':').map(Number)
    return (m || 0) * 60 + (s || 0)
  }

  return (
    <div ref={setNodeRef} style={style} className="p-3 bg-gray-50 rounded-lg border border-gray-200 mb-2">
      <div className="flex items-start gap-2">
        <button {...attributes} {...listeners} className="mt-2 cursor-grab text-gray-400 hover:text-gray-600">
          <GripVertical className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-6 h-6 rounded-full bg-thermomix-600 text-white text-xs flex items-center justify-center font-bold shrink-0">
              {idx + 1}
            </span>
            <textarea
              className="input resize-none"
              rows={2}
              placeholder="Opis koraka *"
              value={step.instruction}
              onChange={(e) => onChange(idx, 'instruction', e.target.value)}
            />
          </div>

          <button
            type="button"
            onClick={() => setShowThermo(!showThermo)}
            className="flex items-center gap-1 text-xs text-thermomix-600 hover:text-thermomix-800 mb-2"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showThermo ? 'rotate-180' : ''}`} />
            Thermomix postavke
          </button>

          {showThermo && (
            <div className="grid grid-cols-4 gap-2">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Temperatura</label>
                <select className="input text-xs" value={step.temperature || ''} onChange={(e) => onChange(idx, 'temperature', e.target.value || null)}>
                  {TEMPERATURES.map((t) => <option key={t} value={t}>{t || '—'}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Brzina</label>
                <select className="input text-xs" value={step.speed || ''} onChange={(e) => onChange(idx, 'speed', e.target.value || null)}>
                  {SPEEDS.map((s) => <option key={s} value={s}>{s || '—'}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Trajanje (mm:ss)</label>
                <input
                  className="input text-xs"
                  placeholder="00:00"
                  value={durationToString(step.duration_seconds)}
                  onChange={(e) => onChange(idx, 'duration_seconds', parseDuration(e.target.value))}
                  pattern="\d{1,2}:\d{2}"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Pribor</label>
                <select className="input text-xs" value={step.accessory || ''} onChange={(e) => onChange(idx, 'accessory', e.target.value || null)}>
                  {ACCESSORIES.map((a) => <option key={a} value={a}>{a || '—'}</option>)}
                </select>
              </div>
            </div>
          )}
        </div>
        <button onClick={() => onRemove(idx)} className="mt-2 text-red-400 hover:text-red-600">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export default function RecipeEditor({ initialData = {}, onSubmit, isLoading }) {
  const [form, setForm] = useState({
    title: initialData.title || '',
    description: initialData.description || '',
    source_url: initialData.source_url || '',
    image_url: initialData.image_url || '',
    servings: initialData.servings || 4,
    prep_time: initialData.prep_time || 0,
    cook_time: initialData.cook_time || 0,
    difficulty: initialData.difficulty || 'medium',
    language: initialData.language || 'hr',
    tags: initialData.tags?.map((t) => (typeof t === 'string' ? t : t.name)).join(', ') || '',
    ingredients: initialData.ingredients || [],
    steps: initialData.steps || [],
  })

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const setField = (field, value) => setForm((f) => ({ ...f, [field]: value }))

  const addIngredient = () =>
    setForm((f) => ({
      ...f,
      ingredients: [...f.ingredients, { order_idx: f.ingredients.length, quantity: '', unit: '', name: '', preparation_note: '' }],
    }))

  const updateIngredient = (idx, field, value) =>
    setForm((f) => ({
      ...f,
      ingredients: f.ingredients.map((ing, i) => (i === idx ? { ...ing, [field]: value } : ing)),
    }))

  const removeIngredient = (idx) =>
    setForm((f) => ({
      ...f,
      ingredients: f.ingredients.filter((_, i) => i !== idx).map((ing, i) => ({ ...ing, order_idx: i })),
    }))

  const addStep = () =>
    setForm((f) => ({
      ...f,
      steps: [...f.steps, { order_idx: f.steps.length, instruction: '', duration_seconds: null, temperature: null, speed: null, accessory: null }],
    }))

  const updateStep = (idx, field, value) =>
    setForm((f) => ({
      ...f,
      steps: f.steps.map((s, i) => (i === idx ? { ...s, [field]: value } : s)),
    }))

  const removeStep = (idx) =>
    setForm((f) => ({
      ...f,
      steps: f.steps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order_idx: i })),
    }))

  const handleIngDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return
    const fromIdx = parseInt(active.id.replace('ing-', ''))
    const toIdx = parseInt(over.id.replace('ing-', ''))
    setForm((f) => {
      const items = [...f.ingredients]
      const [moved] = items.splice(fromIdx, 1)
      items.splice(toIdx, 0, moved)
      return { ...f, ingredients: items.map((ing, i) => ({ ...ing, order_idx: i })) }
    })
  }

  const handleStepDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return
    const fromIdx = parseInt(active.id.replace('step-', ''))
    const toIdx = parseInt(over.id.replace('step-', ''))
    setForm((f) => {
      const items = [...f.steps]
      const [moved] = items.splice(fromIdx, 1)
      items.splice(toIdx, 0, moved)
      return { ...f, steps: items.map((s, i) => ({ ...s, order_idx: i })) }
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const payload = {
      ...form,
      servings: parseInt(form.servings) || 4,
      prep_time: parseInt(form.prep_time) || 0,
      cook_time: parseInt(form.cook_time) || 0,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      ingredients: form.ingredients.map((ing, i) => ({ ...ing, order_idx: i })),
      steps: form.steps.map((s, i) => ({ ...s, order_idx: i })),
    }
    onSubmit(payload)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Osnovne informacije</h2>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="label">Naziv recepta *</label>
            <input className="input" required value={form.title} onChange={(e) => setField('title', e.target.value)} placeholder="npr. Pileća juha s knedlama" />
          </div>
          <div>
            <label className="label">Opis</label>
            <textarea className="input resize-none" rows={3} value={form.description} onChange={(e) => setField('description', e.target.value)} placeholder="Kratki opis recepta..." />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="label">Porcije</label>
              <input className="input" type="number" min={1} max={100} value={form.servings} onChange={(e) => setField('servings', e.target.value)} />
            </div>
            <div>
              <label className="label">Priprema (min)</label>
              <input className="input" type="number" min={0} value={form.prep_time} onChange={(e) => setField('prep_time', e.target.value)} />
            </div>
            <div>
              <label className="label">Kuhanje (min)</label>
              <input className="input" type="number" min={0} value={form.cook_time} onChange={(e) => setField('cook_time', e.target.value)} />
            </div>
            <div>
              <label className="label">Težina</label>
              <select className="input" value={form.difficulty} onChange={(e) => setField('difficulty', e.target.value)}>
                {DIFFICULTIES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Jezik</label>
              <select className="input" value={form.language} onChange={(e) => setField('language', e.target.value)}>
                {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Oznake (odvojene zarezom)</label>
              <input className="input" value={form.tags} onChange={(e) => setField('tags', e.target.value)} placeholder="juha, pileće, brzo..." />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">URL slike</label>
              <input className="input" type="url" value={form.image_url} onChange={(e) => setField('image_url', e.target.value)} placeholder="https://..." />
            </div>
            <div>
              <label className="label">Izvor (URL)</label>
              <input className="input" type="url" value={form.source_url} onChange={(e) => setField('source_url', e.target.value)} placeholder="https://..." />
            </div>
          </div>
        </div>
      </div>

      {/* Ingredients */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Sastojci ({form.ingredients.length})</h2>
          <button type="button" onClick={addIngredient} className="btn-secondary">
            <Plus className="w-4 h-4" /> Dodaj sastojak
          </button>
        </div>
        {form.ingredients.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-6">Nema sastojaka. Dodajte prvi!</p>
        )}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleIngDragEnd}>
          <SortableContext items={form.ingredients.map((_, i) => `ing-${i}`)} strategy={verticalListSortingStrategy}>
            {form.ingredients.map((ing, idx) => (
              <SortableIngredient key={`ing-${idx}`} ingredient={ing} idx={idx} onChange={updateIngredient} onRemove={removeIngredient} />
            ))}
          </SortableContext>
        </DndContext>
      </div>

      {/* Steps */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Koraci ({form.steps.length})</h2>
          <button type="button" onClick={addStep} className="btn-secondary">
            <Plus className="w-4 h-4" /> Dodaj korak
          </button>
        </div>
        {form.steps.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-6">Nema koraka. Dodajte prvi!</p>
        )}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleStepDragEnd}>
          <SortableContext items={form.steps.map((_, i) => `step-${i}`)} strategy={verticalListSortingStrategy}>
            {form.steps.map((step, idx) => (
              <SortableStep key={`step-${idx}`} step={step} idx={idx} onChange={updateStep} onRemove={removeStep} />
            ))}
          </SortableContext>
        </DndContext>
      </div>

      <div className="flex justify-end gap-3">
        <button type="submit" className="btn-primary" disabled={isLoading}>
          {isLoading ? 'Spremanje...' : 'Spremi recept'}
        </button>
      </div>
    </form>
  )
}
