import { useState } from 'react'
import { RestaurantWebShell } from './screens/restaurant/RestaurantWebShell'
import { CustomerTrackingWebShell } from './screens/customer/CustomerTrackingWebShell'

function App() {
  const [mode, setMode] = useState('restaurant')

  return (
    <div>
      <div
        style={{
          position: 'fixed',
          right: 16,
          bottom: 16,
          zIndex: 50,
          display: 'flex',
          gap: 8,
          border: '1px solid #cbd5e1',
          borderRadius: 999,
          background: '#fff',
          padding: 6,
        }}
      >
        <button type="button" className="rb-icon-btn" onClick={() => setMode('restaurant')}>
          Restaurante
        </button>
        <button type="button" className="rb-icon-btn" onClick={() => setMode('tracking')}>
          Tracking
        </button>
      </div>
      {mode === 'restaurant' ? <RestaurantWebShell /> : <CustomerTrackingWebShell />}
    </div>
  )
}

export default App
