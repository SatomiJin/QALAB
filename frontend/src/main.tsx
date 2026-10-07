import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/archivo/wdth.css';
import './styles/global.scss';

const root = createRoot(document.getElementById('root')!);

// Set when a failed app chunk already triggered one reload.
const RELOADED_KEY = 'qalab.chunkReload';

/** The browser could not download a JS chunk (new deploy, network). */
function isChunkLoadError(error: unknown): boolean {
  return (
    error instanceof Error &&
    // Chrome / Edge, Firefox, Safari.
    /dynamically imported module|Importing a module script failed/i.test(
      error.message,
    )
  );
}

function reloadedOnce(): boolean {
  try {
    if (sessionStorage.getItem(RELOADED_KEY)) return true;
    sessionStorage.setItem(RELOADED_KEY, '1');
  } catch {
    // Storage blocked: do not risk a reload loop.
    return true;
  }
  return false;
}

// Load the app lazily so an invalid env config shows a readable message
// instead of a blank page. i18n is not loaded yet, so the text is English.
import('./app/App')
  .then(({ App }) => {
    try {
      sessionStorage.removeItem(RELOADED_KEY);
    } catch {
      // Nothing to clean up.
    }
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  })
  .catch((error: unknown) => {
    console.error(error);
    const chunk = isChunkLoadError(error);
    // Usually a deploy happened while the page was open: the new files are
    // there a moment later, so one reload fixes it.
    if (chunk && !reloadedOnce()) {
      window.location.reload();
      return;
    }
    root.render(
      <div role="alert" style={{ padding: 24 }}>
        <h1>{chunk ? 'QALAB could not load' : 'Configuration error'}</h1>
        {chunk ? (
          <p>
            The app could not be downloaded, usually right after an update.
            Check your connection, then reload the page (Ctrl+Shift+R).
          </p>
        ) : (
          <pre style={{ whiteSpace: 'pre-wrap' }}>
            {error instanceof Error ? error.message : String(error)}
          </pre>
        )}
      </div>,
    );
  });
