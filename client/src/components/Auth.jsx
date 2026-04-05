import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { Mail, Lock, Loader2, ArrowRight, UserPlus, LogIn, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Auth({ onAuthSuccess }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [loading, setLoading] = useState(false)

  const handleAuth = async (e) => {
    e.preventDefault()
    if (!email || !password) return toast.error('Email ve şifre gerekli')
    if (password.length < 6) return toast.error('Şifre en az 6 karakter olmalı')
    
    setLoading(true)
    try {
      if (mode === 'register') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        
        // Supabase might auto-login if email confirmation is off. 
        // We explicitly sign out to ensure manual login as requested.
        await supabase.auth.signOut()
        
        toast.success('Kayıt başarılı! Lütfen giriş yapın.')
        setMode('login')
        setLoading(false)
        return
      }
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      
      toast.success('Hoş geldiniz!')
      onAuthSuccess?.()
    } catch (error) {
      toast.error(error.message === 'Invalid login credentials' ? 'E-posta veya şifre hatalı' : error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#050505] z-[9999] overflow-y-auto py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,0,0,0.1)_0%,transparent_70%)] pointer-events-none"></div>
      
      <div className="w-full max-w-md px-6 relative z-10">
        <div className="glass p-8 md:p-10 shadow-2xl shadow-primary/20 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50"></div>
          
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-primary mb-6 animate-bounce">
              <Sparkles size={12} /> Premium Access
            </div>
            
            <h2 className="text-4xl font-black mb-3 leading-tight tracking-tighter">
              YTB <span className="text-primary italic">PRO</span>
            </h2>
            <p className="text-gray-500 text-sm font-medium">
              {mode === 'login' ? 'Tekrar hoş geldiniz, giriş yapın.' : 'Yeni hesabınızı oluşturun ve başlayın.'}
            </p>
          </div>

          <div className="flex bg-white/5 p-1 rounded-xl mb-8">
            <button 
              onClick={() => setMode('login')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${mode === 'login' ? 'bg-white/10 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <LogIn size={16} /> Giriş Yap
            </button>
            <button 
              onClick={() => setMode('register')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${mode === 'register' ? 'bg-white/10 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
            >
              <UserPlus size={16} /> Kayıt Ol
            </button>
          </div>

          <form onSubmit={handleAuth} className="flex flex-col gap-5">
            <div className="relative group">
              <Mail size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors" />
              <input 
                type="email" 
                placeholder="E-posta" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-lg focus:outline-none focus:border-primary transition-all ring-0"
                required
              />
            </div>

            <div className="relative group">
              <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-primary transition-colors" />
              <input 
                type="password" 
                placeholder="Şifre" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-lg focus:outline-none focus:border-primary transition-all ring-0"
                required
              />
            </div>

            <button type="submit" className="primary-btn flex items-center justify-center gap-3 text-lg py-4 w-full mt-2" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : (
                <>
                  {mode === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>
        </div>
        
        <div className="mt-8 flex flex-col items-center gap-4">
          <p className="text-[9px] uppercase font-black tracking-[0.3em] text-gray-700">
            Secure Encryption • All Rights Reserved
          </p>
        </div>
      </div>
    </div>
  )
}
