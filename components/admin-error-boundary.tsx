"use client"

import { Component, ReactNode } from "react"

export default class AdminErrorBoundary extends Component<{ children: ReactNode, fallback?: ReactNode }, { hasError: boolean, error?: any }> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error }
  }
  componentDidCatch(error: any, info: any) {
    console.error("Admin ErrorBoundary caught:", error, info)
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="h-full w-full flex items-center justify-center bg-black text-white">
          <div className="text-center space-y-3">
            <div className="text-2xl">:(</div>
            <div className="text-sm text-slate-300">Algo deu errado ao carregar esta página.</div>
            <button
              className="px-4 py-2 rounded bg-orange-600 hover:bg-orange-500 text-white text-sm"
              onClick={() => {
                this.setState({ hasError: false, error: null })
                if (typeof window !== "undefined") window.location.reload()
              }}
            >
              Recarregar
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
