import { useState, useEffect } from 'react'
import { Search, Download, Trash2, History, User, LogOut, CheckCircle2, Loader2, Sparkles, AlertCircle, Zap, Clock, Youtube, Play, Music, Video, Settings } from 'lucide-react'
import Auth from './components/Auth'
import ProgressBar from './components/ProgressBar'
import { supabase } from './supabaseClient'
import toast, { Toaster } from 'react-hot-toast'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:10000'

function App() {
  const [session, setSession] = useState(null)
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [videoInfo, setVideoInfo] = useState(null)
  const [format, setFormat] = useState('mp4')
  const [quality, setQuality] = useState('720p')
  const [downloading, setDownloading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [progressData, setProgressData] = useState(null)
  const [history, setHistory] = useState([])
  const [ffmpegAvailable, setFfmpegAvailable] = useState(true)

  useEffect(() => {
    // Check FFmpeg status
    fetch(`${API_BASE_URL}/api/status`)
      .then(res => res.json())
      .then(data => setFfmpegAvailable(data.ffmpeg))
      .catch(() => setFfmpegAvailable(false))

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchHistory(session.user.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchHistory(session.user.id)
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchHistory = async (userId) => {
    const { data, error } = await supabase
      .from('download_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (!error) setHistory(data)
  }

  const fetchInfo = async () => {
    if (!url) {
      toast.error('Lütfen geçerli bir URL girin.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/info?url=${encodeURIComponent(url)}`)
      if (!res.ok) throw new Error('Video bilgisi alınamadı')
      const data = await res.json()
      setVideoInfo(data)
      toast.success('Video analizi tamamlandı!')
    } catch (e) {
      toast.error('Video bulunamadı veya bir hata oluştu.')
    } finally {
      setLoading(false)
    }
  }

  const startDownload = async (vInfo = videoInfo) => {
    if (!vInfo) return
    
    const isHighQuality = (quality === '4K' || quality === '1080p')
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(7)}`
    
    setProcessing(true)
    setProgressData({ progress: 0, status: 'starting', message: 'Hazırlanıyor...' })
    
    // Establishing SSE connection for progress
    const eventSource = new EventSource(`${API_BASE_URL}/api/progress/${taskId}`)
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)
      setProgressData(data)
      
      if (data.status === 'completed' || data.status === 'error') {
        eventSource.close()
        if (data.status === 'completed') {
          setDownloading(false)
          setProcessing(false)
          toast.success('İndirme başlatıldı!', { id: 'download' })
        }
      }
    }

    eventSource.onerror = () => {
      eventSource.close()
    }

    try {
      const downloadUrl = `${API_BASE_URL}/api/download?url=${encodeURIComponent(vInfo.url || url)}&format=${format}&quality=${quality}&taskId=${taskId}`
      
      // Trigger the file download
      window.location.href = downloadUrl
      
      setDownloading(true)
      
      await supabase.from('download_history').insert({
        user_id: session.user.id,
        video_title: vInfo.title,
        video_url: vInfo.url || url,
        thumbnail_url: vInfo.thumbnail,
        format: format,
        quality: quality
      })
      fetchHistory(session.user.id)
    } catch (e) {
      setProcessing(false)
      setProgressData(null)
      eventSource.close()
      toast.error('İndirme başlatılamadı.', { id: 'download' })
    }
  }

  const handleLogout = () => {
    supabase.auth.signOut()
    toast.success('Çıkış yapıldı')
  }

  if (!session) {
    return (
      <>
        <Auth onAuthSuccess={() => toast.success('Hoş geldiniz!')} />
        <Toaster position="top-center" reverseOrder={false} />
      </>
    )
  }

  return (
    <div className="min-h-screen bg-dark pt-20 px-4">
      <Toaster position="top-center" reverseOrder={false} />
      
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center p-4">
        <div className="glass w-full max-w-6xl flex justify-between items-center px-6 py-3">
          <div className="flex items-center gap-3 font-bold text-xl tracking-tight">
            <Youtube className="text-primary" size={32} />
            <span>YTB <span className="text-primary">PRO</span></span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-full text-sm font-medium">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="max-w-[150px] truncate text-gray-300">{session.user.email}</span>
              <span className="bg-primary/20 text-primary text-[10px] px-2 py-0.5 rounded-md font-black uppercase tracking-tighter ml-1">PRO</span>
            </div>
            <button onClick={handleLogout} className="text-gray-500 hover:text-white transition-colors flex items-center gap-2 text-xs font-black uppercase tracking-widest bg-white/5 px-4 py-2 rounded-full border border-transparent hover:border-red-500/30">
              <LogOut size={14} /> Çıkış
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto pb-20">
        <header className="text-center mb-16 animate-in mt-14">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 px-4 py-1.5 rounded-full text-[12px] font-black uppercase tracking-[0.2em] text-primary mb-8 shadow-xl shadow-primary/10">
            <Sparkles size={14} className="animate-pulse" /> Ultimate Downloader
          </div>
          <h1 className="text-6xl md:text-8xl font-black mb-6 leading-[0.9] tracking-tighter">
            PRO <span className="premium-gradient italic">DOWNLOADS</span>
          </h1>
          <p className="text-gray-500 text-xl font-medium max-w-2xl mx-auto leading-relaxed">
            4K çözünürlük, kristal netliğinde ses ve <span className="text-white">sınırsız özgürlük</span> ile medyanızı yönetin.
          </p>
        </header>

        {!ffmpegAvailable && (
          <div className="ffmpeg-warning animate-in mx-auto max-w-4xl mb-8">
            <Settings className="animate-spin-slow" size={24} />
            <div className="flex-1">
              <h4 className="font-bold text-white mb-1 tracking-tight">FFmpeg Bulunamadı (Kritik!)</h4>
              <p className="text-sm opacity-80 leading-relaxed">Sisteminizde FFmpeg eksik olduğu için 1080p ve 4K videolar birleştirilemiyor. İndirmeler otomatik olarak 720p (veya altı) kalitesine düşürülecektir.</p>
            </div>
            <a href="https://ffmpeg.org/download.html" target="_blank" rel="noreferrer" className="bg-orange-500 hover:bg-orange-600 text-black px-4 py-2 rounded-lg text-xs font-black uppercase transition-all shadow-lg active:scale-95">
              NASIL YÜKLENİR?
            </a>
          </div>
        )}

        <section className="glass p-8 mb-12 shadow-2xl shadow-primary/5 transition-transform hover:-translate-y-1">
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <input 
              type="text" 
              placeholder="YouTube URL yapıştırın..." 
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-lg focus:outline-none focus:border-primary transition-all ring-0 focus:ring-2 focus:ring-primary/20"
            />
            <button 
              className="primary-btn flex items-center justify-center gap-2 min-w-[160px]" 
              onClick={fetchInfo}
              disabled={loading}
            >
              {loading ? <Loader2 className="animate-spin" /> : 'Videoyu Analiz Et'}
            </button>
          </div>

          {videoInfo && (
            <div className="animate-in flex flex-col gap-8">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="relative group overflow-hidden rounded-2xl aspect-video md:w-[320px]">
                  <img src={videoInfo.thumbnail} alt="thumbnail" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play size={48} className="text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-2 line-clamp-2">{videoInfo.title}</h3>
                  <p className="text-gray-400 font-medium">{videoInfo.uploader} • {videoInfo.duration_string}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-end">
                <div className="flex flex-col gap-3">
                  <label className="text-xs uppercase tracking-widest text-gray-500 font-bold">Format</label>
                  <div className="flex bg-white/5 p-1 rounded-xl">
                    <button 
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${format === 'mp4' ? 'bg-white/10 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`} 
                      onClick={() => setFormat('mp4')}
                    >
                      <Video size={16} /> MP4
                    </button>
                    <button 
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${format === 'mp3' ? 'bg-white/10 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`} 
                      onClick={() => setFormat('mp3')}
                    >
                      <Music size={16} /> MP3
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <label className="text-xs uppercase tracking-widest text-gray-500 font-bold">Kalite</label>
                  <select 
                    value={quality} 
                    onChange={(e) => {
                      const val = e.target.value
                      if (!ffmpegAvailable && (val === '4K' || val === '1080p')) {
                        toast.error('FFmpeg yüklü olmadığı için 1080p ve 4K indirmeler 720p\'ye düşürülecektir.')
                      }
                      setQuality(val)
                    }}
                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-all"
                  >
                    <option value="4K">4K Ultra HD {!ffmpegAvailable && '(Düşük Kalite)'}</option>
                    <option value="1080p">1080p Full HD {!ffmpegAvailable && '(Düşük Kalite)'}</option>
                    <option value="720p">720p HD</option>
                    <option value="480p">480p SD</option>
                    <option value="360p">360p Düşük</option>
                  </select>
                </div>

                <button 
                  className={`bg-white text-black hover:bg-gray-200 transition-all font-bold py-3 rounded-xl flex items-center justify-center gap-3 active:scale-95 ${processing ? 'opacity-50 cursor-not-allowed' : ''}`} 
                  onClick={() => startDownload()}
                  disabled={downloading || processing}
                >
                  {processing ? <Loader2 className="animate-spin" size={22} /> : (downloading ? <CheckCircle2 size={22} className="text-green-600" /> : <Download size={22} />)}
                  {processing ? 'Birleştiriliyor...' : (downloading ? 'Başlatıldı' : 'Hemen İndir')}
                </button>

                {processing && progressData && (
                  <ProgressBar 
                    progress={progressData.progress}
                    status={progressData.status}
                    message={progressData.message}
                    speed={progressData.speed}
                    eta={progressData.eta}
                  />
                )}
              </div>
            </div>
          )}
        </section>

        {history.length > 0 && (
          <section className="animate-in">
            <div className="flex items-center gap-3 mb-6">
              <History size={24} className="text-primary" />
              <h2 className="text-2xl font-black">İndirme Geçmişi</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {history.map((item) => (
                <div key={item.id} className="glass p-4 group flex items-center gap-4 hover:border-primary/30 transition-all cursor-default">
                  <img src={item.thumbnail_url} className="w-24 h-14 rounded-lg object-cover bg-black/20" alt="thumb" />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold truncate mb-1">{item.video_title}</h4>
                    <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">
                      {item.quality} • {item.format}
                    </p>
                  </div>
                  <button 
                    className="p-2.5 bg-white/5 hover:bg-primary/20 rounded-full text-gray-400 hover:text-primary transition-all" 
                    onClick={() => {
                      setUrl(item.video_url)
                      fetchInfo()
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                  >
                    <Download size={16} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="py-10 text-center text-gray-600 text-xs tracking-widest font-bold uppercase">
        © 2026 YTB PRO Downloader • Powered by yt-dlp & FFmpeg
      </footer>
    </div>
  )
}

export default App
