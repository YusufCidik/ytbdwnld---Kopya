import { Loader2, Zap, Clock, CheckCircle2, AlertCircle } from 'lucide-react'

export default function ProgressBar({ progress, status, message, speed, eta }) {
  const isError = status === 'error'
  const isCompleted = status === 'completed'
  const isMerging = status === 'merging'

  return (
    <div className="w-full mt-6 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="glass p-5 relative overflow-hidden border-primary/20">
        {/* Progress Background glow */}
        <div 
          className="absolute inset-0 bg-primary/5 transition-all duration-1000"
          style={{ width: `${progress}%` }}
        ></div>

        <div className="relative z-10">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              {isCompleted ? (
                <CheckCircle2 className="text-green-500" size={18} />
              ) : isError ? (
                <AlertCircle className="text-red-500" size={18} />
              ) : (
                <Loader2 className="animate-spin text-primary" size={18} />
              )}
              <span className="text-sm font-bold tracking-tight">
                {message}
              </span>
            </div>
            <span className="text-xl font-black italic text-primary">
              {Math.round(progress)}%
            </span>
          </div>

          <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 p-0.5">
            <div 
              className={`h-full rounded-full transition-all duration-500 ease-out ${isError ? 'bg-red-500' : 'bg-gradient-to-r from-primary/50 to-primary shadow-[0_0_15px_rgba(255,0,0,0.5)]'}`}
              style={{ width: `${progress}%` }}
            ></div>
          </div>

          {!isCompleted && !isError && (
            <div className="flex gap-4 mt-4">
              {speed && (
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  <Zap size={12} className="text-yellow-500" />
                  {speed}
                </div>
              )}
              {eta && (
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  <Clock size={12} className="text-blue-500" />
                  {eta} Kalan
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
