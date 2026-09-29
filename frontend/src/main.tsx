import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/global.scss';

const root = createRoot(document.getElementById('root')!);

// Load the app lazily so an invalid env config shows a readable message
// instead of a blank page.
import('./app/App')
  .then(({ App }) => {
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  })
  .catch((error: unknown) => {
    console.error(error);
    root.render(
      <div role="alert" style={{ padding: 24, fontFamily: 'sans-serif' }}>
        <h1>Configuration error</h1>
        <pre style={{ whiteSpace: 'pre-wrap' }}>
          {error instanceof Error ? error.message : String(error)}
        </pre>
      </div>,
    );
  });
