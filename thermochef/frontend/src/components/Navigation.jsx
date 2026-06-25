import { Link, useLocation } from 'react-router-dom'
import { ChefHat, BookOpen, Upload, Settings, Zap } from 'lucide-react'

const navItems = [
  { path: '/', label: 'Recepti', icon: BookOpen },
  { path: '/import', label: 'Uvoz', icon: Upload },
  { path: '/settings', label: 'Postavke', icon: Settings },
]

export default function Navigation() {
  const { pathname } = useLocation()

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-thermomix-600 rounded-lg p-1.5">
              <ChefHat className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-gray-900">
              Thermo<span className="text-thermomix-600">Chef</span>
            </span>
          </Link>

          <div className="flex items-center gap-1">
            {navItems.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === path || (path !== '/' && pathname.startsWith(path))
                    ? 'bg-thermomix-50 text-thermomix-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  )
}
