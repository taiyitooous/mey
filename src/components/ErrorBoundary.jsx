import { Component } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null, info: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    this.setState({ info })
    console.error('[MEY ErrorBoundary]', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center gap-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <AlertTriangle size={20} className="text-destructive" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white mb-1">Erro ao renderizar esta página</p>
            <p className="text-xs text-faint font-mono max-w-md">{this.state.error.message}</p>
          </div>
          <button
            onClick={() => this.setState({ error: null, info: null })}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: 'white', color: 'black' }}
          >
            <RefreshCw size={13} />
            Tentar novamente
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
