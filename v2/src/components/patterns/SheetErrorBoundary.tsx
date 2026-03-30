'use client';
import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; }

export class SheetErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <p className="text-[15px] text-label-secondary">
            Er ging iets mis. Probeer het opnieuw.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-4 rounded-xl bg-accent px-4 py-2 text-[14px] font-medium text-white"
          >
            Opnieuw proberen
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
