import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

window._set = (k,v) => { try { localStorage.setItem(k,v); return {value:v}; } catch(e) { return null; } }
window._get = (k) => { try { const v=localStorage.getItem(k); return v?{value:v}:null; } catch(e) { return null; } }

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>
)
