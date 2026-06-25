import { useState, useEffect } from 'react'
import { Save, CheckCircle, AlertCircle, Loader, Download, LogOut, Wifi, WifiOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { settingsApi, cookidooApi } from '../api/client'

export default function Settings() {
  const [settings, setSettings] = useState({ language: 'hr', scraper_timeout: '30', theme: 'light' })
  const [cookidooStatus, setCookidooStatus] = useState(null)
  const [tokenInfo, setTokenInfo] = useState(null)
  const [cookidooForm, setCookidooForm] = useState({ email: '', password: '', country: 'HR', language: 'hr-HR' })
  const [loading, setLoading] = useState(false)
  const [testingConn, setTestingConn] = useState(false)
  const [loggingIn, setLoggingIn] = useState(false)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    settingsApi.getAll().then((r) => setSettings(r.data)).catch(() => {})
    cookidooApi.status().then((r) => setCookidooStatus(r.data)).catch(() => {})
    cookidooApi.tokenInfo().then((r) => setTokenInfo(r.data)).catch(() => {})
  }, [])

  const handleSettingSave = async (key, value) => {
    try {
      await settingsApi.update(key, value)
      toast.success('Postavka spremljena')
    } catch {
      toast.error('Greška pri spremanju')
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

        {/* API approach note */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-700">
          <p className="font-medium">ℹ️ Napomena o Cookidoo API integraciji</p>
          <p className="mt-1 text-amber-600">
            Cookidoo nema javno dostupan API. ThermoChef koristi neformalni reverse-engineered API koji može prestati raditi bez upozorenja.
            Kao alternativu koristite <strong>Export ZIP</strong> funkciju za ručni uvoz u Cookidoo.
          </p>
        </div>

        {tokenInfo?.has_tokens ? (
          <div className="space-y-3">
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <p className="text-gray-600">Prijavljeni kao: <span className="font-medium">{tokenInfo.email}</span></p>
              <p className="text-gray-500">Zemlja: {tokenInfo.country} · Jezik: {tokenInfo.language}</p>
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
                <label className="label">E-mail adresa</label>
                <input
                  className="input"
                  type="email"
                  required
                  value={cookidooForm.email}
                  onChange={(e) => setCookidooForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="vas@email.com"
                />
              </div>
              <div className="col-span-2">
                <label className="label">Lozinka</label>
                <input
                  className="input"
                  type="password"
                  required
                  value={cookidooForm.password}
                  onChange={(e) => setCookidooForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="label">Zemlja</label>
                <select className="input" value={cookidooForm.country} onChange={(e) => setCookidooForm((f) => ({ ...f, country: e.target.value }))}>
                  <option value="HR">Hrvatska</option>
                  <option value="DE">Njemačka</option>
                  <option value="AT">Austrija</option>
                  <option value="CH">Švicarska</option>
                  <option value="GB">Velika Britanija</option>
                  <option value="US">SAD</option>
                </select>
              </div>
              <div>
                <label className="label">Jezik sučelja</label>
                <select className="input" value={cookidooForm.language} onChange={(e) => setCookidooForm((f) => ({ ...f, language: e.target.value }))}>
                  <option value="hr-HR">Hrvatski</option>
                  <option value="de-DE">Deutsch</option>
                  <option value="en-GB">English</option>
                </select>
              </div>
            </div>
            <button type="submit" disabled={loggingIn} className="btn-primary">
              {loggingIn ? <Loader className="w-4 h-4 animate-spin" /> : null}
              {loggingIn ? 'Prijava...' : 'Prijavi se na Cookidoo'}
            </button>
          </form>
        )}
      </div>

      {/* App Settings */}
      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Opće postavke</h2>
        <div className="space-y-4">
          <div>
            <label className="label">Zadani jezik recepta</label>
            <select
              className="input"
              value={settings.language}
              onChange={(e) => {
                setSettings((s) => ({ ...s, language: e.target.value }))
                handleSettingSave('language', e.target.value)
              }}
            >
              <option value="hr">Hrvatski</option>
              <option value="en">English</option>
              <option value="de">Deutsch</option>
            </select>
          </div>
          <div>
            <label className="label">Timeout za scraper (sekunde)</label>
            <div className="flex gap-2">
              <input
                className="input"
                type="number"
                min={5}
                max={120}
                value={settings.scraper_timeout}
                onChange={(e) => setSettings((s) => ({ ...s, scraper_timeout: e.target.value }))}
              />
              <button
                onClick={() => handleSettingSave('scraper_timeout', settings.scraper_timeout)}
                className="btn-secondary"
              >
                <Save className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Backup */}
      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-2">Backup baze podataka</h2>
        <p className="text-sm text-gray-500 mb-4">
          Izvezite sve recepte kao JSON datoteku. Možete je koristiti za backup ili prijenos na drugi uređaj.
        </p>
        <button onClick={handleExport} disabled={exporting} className="btn-primary">
          {exporting ? <Loader className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {exporting ? 'Izvoz...' : 'Izvezi sve recepte (JSON)'}
        </button>
      </div>

      {/* About */}
      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-2">O aplikaciji</h2>
        <div className="text-sm text-gray-500 space-y-1">
          <p>ThermoChef v1.0.0</p>
          <p>Thermomix recipe manager s Cookidoo integracijom</p>
          <p className="text-xs mt-2">Cookidoo® je registrirani zaštitni znak tvrtke Vorwerk. Ova aplikacija nije službeni Vorwerk proizvod.</p>
        </div>
      </div>
    </div>
  )
}
