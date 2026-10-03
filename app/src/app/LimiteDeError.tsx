import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Estado {
  error: Error | null
}

/** Evita la pantalla en blanco ante errores de render o de configuracion. */
export class LimiteDeError extends Component<{ children: ReactNode }, Estado> {
  state: Estado = { error: null }

  static getDerivedStateFromError(error: Error): Estado {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Error de render en Fulbeando:', error, info.componentStack)
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children

    return (
      <div className="grid min-h-full place-items-center bg-canvas px-4">
        <div className="surface max-w-md text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-urgent" />
          <h1 className="mt-3 text-lg font-bold text-ink">Algo salio mal</h1>
          <p className="mt-2 text-sm text-ink-muted">{this.state.error.message}</p>
          <button
            type="button"
            className="btn-ghost mt-4"
            onClick={() => {
              this.setState({ error: null })
              window.location.reload()
            }}
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }
}