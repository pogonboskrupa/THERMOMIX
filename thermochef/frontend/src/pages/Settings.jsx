import { useState, useEffect } from 'react'
import { Save, Loader, Download, LogOut, Wifi, WifiOff, Server, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { settingsApi, cookidooApi, getApiUrl, setApiUrl, DEFAULT_API_URL } from '../api/client'

export default function Settings() {
  const [settings, setSettings] = useState({ language: 'hr', scraper_timeout: '30', theme: 'light' })
  const [cookidooStatus, setCookidooStatus] = useState(null)
  const [tokenInfo, setTokenInfo] = useState(null)
  const [cookidooForm, setCookidooForm] = useState({ email: '', password: '', country: 'HR', language: 'hr-HR' })
  const [testingConn, setTestingConn] = useState(false)
  const [loggingIn, setLoggingIn] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [apiUrl, setApiUrlState] = useState(getApiUrl)
  const [apiStatus, setApiStatus] = useState(null) // 'ok' | 'error' | null

  useEffect(() => {
    checkApiStatus()
  }, [])

  const checkApiStatus = async () => {
    try {
      const r = await fetch(`${getApiUrl()}/api/health`)
      if (r.ok) {
        setApiStatus('ok')
        settingsApi.getAll().then((r) => setSettings(r.data)).catch(() => {})
        cookidooApi.status().then((r) => setCookidooStatus(r.data)).catch(() => {})
        cookidooApi.tokenInfo().then((r) => setTokenInfo(r.data)).catch(() => {})
      } else {
        setApiStatus('error')
      }
    } catch {
      setApiStatus('error')
    }
  }

  const handleSaveApiUrl = () => {
    setApiUrl(apiUrl.trim())
    toast.success('Backend URL spremljen')
    setTimeout(checkApiStatus, 300)
  }

  const handleResetApiUrl = () => {
    setApiUrlState(DEFAULT_API_URL)
    setApiUrl(DEFAULT_API_URL)
    setTimeout(checkApiStatus, 300)
  }

  const handleSettingSave = async (key, value) => {
    try {
      await settingsApi.update(key, value)
      toast.success('Postavka spremljena')
    } catch {
      toast.error('Backend nije dostupan')
    }
  }

  const handleCookidooLogin = async (e) => {
    e.preventDefault()
    setLoggingIn(true)
    try {
      await cookidooApi.auth(cookidooForm)
      toast.success('Prijava na Cookidoo uspješna!')
      const statusRes = await cookidooApi.status()
      setCookidooStatus(statusRes.data)
      const tokenRes = await cookidooApi.tokenInfo()
      setTokenInfo(tokenRes.data)
      setCookidooForm((f) => ({ ...f, password: '' }))
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Prijava nije uspjela')
    } finally {
      setLoggingIn(false)
    }
  }

  const handleTestConnection = async () => {
    setTestingConn(true)
    try {
      const res = await cookidooApi.status()
      setCookidooStatus(res.data)
      if (res.data.connected) {
        toast.success(`Veza uspješna! Prijavljeni kao: ${res.data.user || 'Korisnik'}`)
      } else {
        toast.error(res.data.error || 'Veza nije uspostavljena')
      }
    } catch {
      toast.error('Greška pri testiranju veze')
    } finally {
      setTestingConn(false)
    }
  }

  const handleCookidooLogout = async () => {
    await cookidooApi.logout()
    setCookidooStatus(null)
    setTokenInfo(null)
    toast.success('Odjavljeni s Cookidoo')
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await settingsApi.exportDb()
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `thermochef_backup_${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('Baza podataka izvezena!')
    } catch {
      toast.error('Greška pri izvozu')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Postavke</h1>

      {/* Backend Server */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Server className="w-4 h-4 text-thermomix-500" /> Backend server
          </h2>
          {apiStatus === 'ok' && (
            <span className="badge bg-green-100 text-green-700 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" /> Spojen
            </span>
          )}
          {apiStatus === 'error' && (
            <span className="badge bg-red-100 text-red-700 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> Nije dostupan
            </span>
          )}
        </div>

        <p className="text-sm text-gray-500 mb-3">
          ThermoChef zahtijeva Python FastAPI backend za uvoz, OCR i Cookidoo sinkronizaciju.
          Za lokalni rad: <code className="bg-gray-100 px-1 rounded">./start.sh</code> u mapi projekta.
        </p>

        <div className="flex gap-2">
          <input
            className="input flex-1 font-mono text-sm"
            value={apiUrl}
            onChange={(e) => setApiUrlState(e.target.value)}
            placeholder="http://localhost:8000"
          />
          <button onClick={handleSaveApiUrl} className="btn-primary">
            <Save className="w-4 h-4" /> Spremi
          </button>
          <button onClick={checkApiStatus} className="btn-secondary">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {apiUrl !== DEFAULT_API_URL && (
          <button onClick={handleResetApiUrl} className="text-xs text-gray-400 hover:text-gray-600 mt-2">
            Resetiraj na {DEFAULT_API_URL}
          </button>
        )}

        {apiStatus === 'error' && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
            <p className="font-medium">Backend nije dostupan</p>
            <p className="mt-1 text-amber-600">
              Pokrenite backend: <code className="bg-amber-100 px-1 rounded">cd thermochef && ./start.sh</code><br />
              Ili hostate backend na besplatnom servisu (Railway, Render, Fly.io) i postavite URL gore.
            </p>
          </div>
        )}
      </div>

      {/* Cookidoo Section */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Cookidoo integracija</h2>
          {cookidooStatus?.connected ? (
            <span className="badge bg-green-100 text-green-700 flex items-center gap-1">
              <Wifi className="w-3.5 h-3.5" /> Povezano
            </span>
          ) : (
            <span className="badge bg-gray-100 text-gray-500 flex items-center gap-1">
              <WifiOff className="w-3.5 h-3.5" /> Nije povezano
            </span>
          )}
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-700">
          <p className="font-medium">ℹ️ Napomena</p>
          <p className="mt-1 text-amber-600">
            Cookidoo nema javni API. Koristi se neformalni (reverse-engineered) API koji može prestati raditi.
            Alternativa: <strong>Export ZIP</strong> za ručni uvoz.
          </p>
        </div>

        {tokenInfo?.has_tokens ? (
          <div className="space-y-3">
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <p>Prijavljeni kao: <span className="font-medium">{tokenInfo.email}</span></p>
              <p className="text-gray-500">Zemlja: {tokenInfo.country}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={handleTestConnection} disabled={testingConn} className="btn-secondary">
                {testingConn ? <Loader className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
                Test veze
              </button>
              <button onClick={handleCookidooLogout} className="btn-danger">
                <LogOut className="w-4 h-4" /> Odjavi se
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCookidooLogin} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="label">E-mail</label>
                <input className="input" type="email" required
                  value={cookidooForm.email}
                  onChange={(e) => setCookidooForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="col-span-2">
                <label className="label">Lozinka</label>
                <input className="input" type="password" required
                  value={cookidooForm.password}
                  onChange={(e) => setCookidooForm((f) => ({ ...f, password: e.target.value }))} />
              </div>
              <div>
                <label className="label">Zemlja</label>
                <select className="input" value={cookidooForm.country}
                  onChange={(e) => setCookidooForm((f) => ({ ...f, country: e.target.value }))}>
                  <option value="HR">Hrvatska</option>
                  <option value="DE">Njemačka</option>
                  <option value="AT">Austrija</option>
                  <option value="CH">Švicarska</option>
                  <option value="GB">Velika Britanija</option>
                </select>
              </div>
              <div>
                <label className="label">Jezik</label>
                <select className="input" value={cookidooForm.language}
                  onChange={(e) => setCookidooForm((f) => ({ ...f, language: e.target.value }))}>
                  <option value="hr-HR">Hrvatski</option>
                  <option value="de-DE">Deutsch</option>
                  <option value="en-GB">English</option>
                </select>
              </div>
            </div>
            <button type="submit" disabled={loggingIn || apiStatus === 'error'} className="btn-primary">
              {loggingIn && <Loader className="w-4 h-4 animate-spin" />}
              {loggingIn ? 'Prijava...' : 'Prijavi se na Cookidoo'}
            </button>
          </form>
        )}
      </div>

      {/* App settings */}
      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Opće postavke</h2>
        <div className="space-y-4">
          <div>
            <label className="label">Zadani jezik</label>
            <select className="input" value={settings.language}
              onChange={(e) => {
                setSettings((s) => ({ ...s, language: e.target.value }))
                handleSettingSave('language', e.target.value)
              }}>
              <option value="hr">Hrvatski</option>
              <option value="en">English</option>
              <option value="de">Deutsch</option>
            </select>
          </div>
          <div>
            <label className="label">Scraper timeout (sekunde)</label>
            <div className="flex gap-2">
              <input className="input" type="number" min={5} max={120}
                value={settings.scraper_timeout}
                onChange={(e) => setSettings((s) => ({ ...s, scraper_timeout: e.target.value }))} />
              <button onClick={() => handleSettingSave('scraper_timeout', settings.scraper_timeout)} className="btn-secondary">
                <Save className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Backup */}
      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-2">Backup baze podataka</h2>
        <p className="text-sm text-gray-500 mb-4">Izvezite sve recepte kao JSON datoteku.</p>
        <button onClick={handleExport} disabled={exporting || apiStatus === 'error'} className="btn-primary">
          {exporting ? <Loader className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {exporting ? 'Izvoz...' : 'Izvezi sve recepte (JSON)'}
        </button>
      </div>

      {/* PWA info */}
      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-2">Instalacija aplikacije</h2>
        <p className="text-sm text-gray-500 mb-3">
          ThermoChef je PWA (Progressive Web App) – možete je instalirati na telefon ili računalo za brži pristup.
        </p>
        <div className="space-y-1 text-sm text-gray-600">
          <p>📱 <strong>Android/Chrome:</strong> Tap "Dodaj na početni zaslon" u meniju preglednika</p>
          <p>🍎 <strong>iOS/Safari:</strong> Tap Share → "Dodaj na početni zaslon"</p>
          <p>💻 <strong>Desktop:</strong> Klikni ikonu instalacije u adresnoj traci</p>
        </div>
      </div>

      {/* About */}
      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-2">O aplikaciji</h2>
        <div className="text-sm text-gray-500 space-y-1">
          <p>ThermoChef v1.0.0 · PWA + GitHub Pages</p>
          <p className="text-xs mt-2">Cookidoo® je zaštitni znak Vorwerk. Ova aplikacija nije službeni Vorwerk proizvod.</p>
        </div>
      </div>
    </div>
  )
}
