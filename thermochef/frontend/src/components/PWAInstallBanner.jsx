import { useState, useEffect } from 'react'
import { Download, X, Wifi, WifiOff } from 'lucide-react'

export function useOnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])
  return online
}

export default function PWAInstallBanner() {
  const [prompt, setPrompt] = useState(null)
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('pwa_install_dismissed') === '1')
  const [installed, setInstalled] = useState(false)
  const online = useOnlineStatus()

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault()
      setPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => setInstalled(true))
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!prompt) return
    prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setPrompt(null)
  }

  const handleDismiss = () => {
    setDismissed(true)
    localStorage.setItem('pwa_install_dismissed', '1')
  }

  return (
    <>
      {/* Offline banner */}
      {!online && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 text-white text-sm px-4 py-2 flex items-center gap-2 justify-center no-print">
          <WifiOff className="w-4 h-4 text-yellow-400" />
          <span>Offline – prikazuju se predmemorirani recepti</span>
        </div>
      )}

      {/* Install banner */}
      {prompt && !dismissed && !installed && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50 bg-white rounded-xl shadow-2xl border border-thermomix-200 p-4 no-print">
          <div className="flex items-start gap-3">
            <div className="bg-thermomix-100 rounded-lg p-2 shrink-0">
              <Download className="w-5 h-5 text-thermomix-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm">Instaliraj ThermoChef</p>
              <p className="text-gray-500 text-xs mt-0.5">Dodaj na početni zaslon za brži pristup receptima</p>
              <div className="flex gap-2 mt-3">
                <button onClick={handleInstall} className="btn-primary py-1.5 px-3 text-xs">
                  Instaliraj
                </button>
                <button onClick={handleDismiss} className="btn-secondary py-1.5 px-3 text-xs">
                  Ne, hvala
                </button>
              </div>
            </div>
            <button onClick={handleDismiss} className="text-gray-400 hover:text-gray-600 shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
