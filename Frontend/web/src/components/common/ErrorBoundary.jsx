import { Component } from 'react'

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    if (typeof window !== 'undefined' && window.console) {
      window.console.error('Unhandled error caught by ErrorBoundary:', error, info)
    }
  }

  handleReset = () => {
    this.setState({ error: null })
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="rb-error-boundary">
          <div className="rb-error-card">
            <h2>Oops, algo correu mal</h2>
            <p>{String(this.state.error?.message ?? this.state.error)}</p>
            <button type="button" className="rb-btn-accept" onClick={this.handleReset}>
              Recarregar
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
