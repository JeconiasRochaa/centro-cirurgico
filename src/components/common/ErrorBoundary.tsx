import { Component, type ErrorInfo, type ReactNode } from 'react';

/** Captura erros de renderização e exibe uma mensagem segura (sem detalhes internos). */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Erro de interface:', error.name, info.componentStack?.split('\n')[1]); }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="card max-w-md text-center">
          <h1 className="mb-2 text-lg font-bold text-brand">Algo deu errado</h1>
          <p className="mb-4 text-sm text-slate-600">Ocorreu um erro inesperado. Recarregue a página; se persistir, avise o suporte.</p>
          <button className="btn-primary" onClick={() => window.location.assign('/')}>Recarregar</button>
        </div>
      </div>
    );
  }
}
