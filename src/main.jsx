import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles/variables.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/componentes.css';
import './styles/login.css';
import './styles/inventario.css';
import './styles/clientes.css';

createRoot(document.getElementById('root')).render(<App />);
