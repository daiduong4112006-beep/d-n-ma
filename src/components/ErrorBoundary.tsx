import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    window.location.hash = '#dashboard';
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 text-center shadow-xl space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Đã xảy ra sự cố hiển thị</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Hệ thống gặp gián đoạn tạm thời. Bạn có thể làm mới trang hoặc trở về trang chủ.
              </p>
              {this.state.error?.message && (
                <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-left text-xs font-mono text-rose-500 overflow-x-auto max-h-32">
                  {this.state.error.message}
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" /> Làm mới trang
              </button>
              <button
                type="button"
                onClick={() => {
                  window.location.hash = '#dashboard';
                  this.setState({ hasError: false, error: null });
                }}
                className="inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-sm transition-all cursor-pointer"
              >
                <Home className="w-4 h-4" /> Về trang chủ
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
