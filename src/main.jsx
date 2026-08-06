import { createRoot } from 'react-dom/client'
import App            from './App.jsx'
import './index.css'

const loader = document.getElementById('boot-loader')
if (loader) loader.style.display = 'none'

createRoot(document.getElementById('root')).render(<App />)
