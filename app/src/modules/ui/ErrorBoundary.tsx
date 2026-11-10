import React, { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Fulbeando ErrorBoundary] Error no capturado:', error, errorInfo)
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  private handleReload = () => {
    window.location.reload()
  }

  private handleGoHome = () => {
    window.location.href = '/'
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-gradient-to-b from-[#1c0a48] via-[#130730] to-[#0b041e] text-white flex items-center justify-center p-4 select-none">
          <div className="max-w-md w-full bg-white/5 border border-indigo-500/20 rounded-3xl p-6 sm:p-8 text-center space-y-5 shadow-2xl backdrop-blur-xl">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-black uppercase tracking-wider text-white">
                Falta técnica en la jugada
              </h1>
              <p className="text-xs text-indigo-200/70 leading-relaxed">
                Ocurrió un error inesperado al renderizar la pantalla. No te preocupes, tus datos están a salvo.
              </p>
            </div>

            {import.meta.env.DEV && this.state.error && (
              <div className="bg-black/40 border border-rose-500/30 rounded-xl p-3 text-left overflow-auto max-h-40">
                <p className="text-[11px] font-mono text-rose-300 break-words">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-98"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Recargar</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer border border-white/10 active:scale-98"
              >
                <Home className="w-3.5 h-3.5 text-indigo-300" />
                <span>Inicio</span>
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
