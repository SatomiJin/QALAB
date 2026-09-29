import { RouterProvider } from 'react-router';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { Providers } from './Providers';
import { router } from './router';

export function App() {
  return (
    <ErrorBoundary>
      <Providers>
        <RouterProvider router={router} />
      </Providers>
    </ErrorBoundary>
  );
}
