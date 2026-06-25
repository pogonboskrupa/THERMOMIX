import { BrowserRouter, HashRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Navigation from './components/Navigation'
import PWAInstallBanner from './components/PWAInstallBanner'
import Library from './pages/Library'
import RecipeDetail from './pages/RecipeDetail'
import RecipeEdit from './pages/RecipeEdit'
import RecipeNew from './pages/RecipeNew'
import Import from './pages/Import'
import Settings from './pages/Settings'

// Use HashRouter on GitHub Pages (static hosting),
// BrowserRouter when running with a real server that handles 404 redirects.
const isGitHubPages = window.location.hostname.includes('github.io')
const Router = isGitHubPages ? HashRouter : BrowserRouter
const basename = isGitHubPages ? undefined : (import.meta.env.BASE_URL || '/')

export default function App() {
  return (
    <Router basename={isGitHubPages ? undefined : basename}>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="pb-16">
          <Routes>
            <Route path="/" element={<Library />} />
            <Route path="/recipes/new" element={<RecipeNew />} />
            <Route path="/recipes/:id" element={<RecipeDetail />} />
            <Route path="/recipes/:id/edit" element={<RecipeEdit />} />
            <Route path="/import" element={<Import />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
        <PWAInstallBanner />
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 4000,
            style: { background: '#1f2937', color: '#fff', borderRadius: '10px' },
            success: { iconTheme: { primary: '#f97316', secondary: '#fff' } },
          }}
        />
      </div>
    </Router>
  )
}
