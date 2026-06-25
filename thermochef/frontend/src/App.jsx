import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Navigation from './components/Navigation'
import Library from './pages/Library'
import RecipeDetail from './pages/RecipeDetail'
import RecipeEdit from './pages/RecipeEdit'
import RecipeNew from './pages/RecipeNew'
import Import from './pages/Import'
import Settings from './pages/Settings'

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main>
          <Routes>
            <Route path="/" element={<Library />} />
            <Route path="/recipes/new" element={<RecipeNew />} />
            <Route path="/recipes/:id" element={<RecipeDetail />} />
            <Route path="/recipes/:id/edit" element={<RecipeEdit />} />
            <Route path="/import" element={<Import />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 4000,
            style: { background: '#1f2937', color: '#fff', borderRadius: '10px' },
            success: { iconTheme: { primary: '#f97316', secondary: '#fff' } },
          }}
        />
      </div>
    </BrowserRouter>
  )
}
