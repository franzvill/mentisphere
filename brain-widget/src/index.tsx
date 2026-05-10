import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

function init() {
  const containers = document.querySelectorAll<HTMLElement>('[data-mentisphere-brain]');
  containers.forEach(container => {
    const root = createRoot(container);
    root.render(<App />);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
