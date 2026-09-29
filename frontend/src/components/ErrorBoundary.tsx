import { Button, Result } from 'antd';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import i18n from '../i18n';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Last-resort boundary for render errors outside the router. It sits above
 * the providers, so it uses the i18n instance directly instead of hooks.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled render error', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <Result
        status="500"
        title={i18n.t('errors.crashTitle')}
        subTitle={i18n.t('errors.crashDescription')}
        extra={
          <Button type="primary" onClick={() => window.location.reload()}>
            {i18n.t('errors.reload')}
          </Button>
        }
      />
    );
  }
}
