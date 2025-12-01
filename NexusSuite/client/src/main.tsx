import { createRoot } from 'react-dom/client';
import App from './App';

// 👇 import your theme first
import './themes/theme.css';
// 👇 then import your main Tailwind index.css
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);
