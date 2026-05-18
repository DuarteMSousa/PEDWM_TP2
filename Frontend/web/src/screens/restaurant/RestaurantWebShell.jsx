import { useEffect, useMemo, useState } from 'react'
import { PageContainer } from '../../components/layout/PageContainer'
import { RESTAURANT_VIEWS } from '../../features/restaurant/views'
import { RestaurantSideNav } from '../../features/restaurant/components/RestaurantSideNav'
import { RestaurantLoginScreen } from '../../features/restaurant/screens/RestaurantLoginScreen'

const SESSION_STORAGE_KEY = 'fastbite_restaurant_session'

function loadStoredSession() {
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function RestaurantWebShell() {
  const [activeViewId, setActiveViewId] = useState('dashboard')
  const [session, setSession] = useState(loadStoredSession)
  const [selectedOrderId, setSelectedOrderId] = useState('')

  const activeView = useMemo(
    () => RESTAURANT_VIEWS.find((view) => view.id === activeViewId) ?? RESTAURANT_VIEWS[0],
    [activeViewId],
  )
  const ActiveScreen = activeView.Component

  useEffect(() => {
    if (session) {
      window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
      return
    }

    window.localStorage.removeItem(SESSION_STORAGE_KEY)
  }, [session])

  function handleLogin(nextSession) {
    setSession(nextSession)
    setSelectedOrderId('')
    setActiveViewId('dashboard')
  }

  function handleLogout() {
    setSession(null)
    setSelectedOrderId('')
  }

  if (!session) {
    return (
      <PageContainer restaurantUnit="Acesso de staff">
        <RestaurantLoginScreen onLogin={handleLogin} />
      </PageContainer>
    )
  }

  return (
    <PageContainer restaurantUnit={`Unidade ${session.restaurant}`}>
      <div className="rb-shell">
        <RestaurantSideNav
          views={RESTAURANT_VIEWS}
          activeViewId={activeView.id}
          onSelect={setActiveViewId}
          operatorName={session.operatorName}
          onLogout={handleLogout}
        />
        <section className="rb-main">
          <ActiveScreen
            session={session}
            selectedOrderId={selectedOrderId}
            onSelectOrder={setSelectedOrderId}
            onNavigate={setActiveViewId}
          />
        </section>
      </div>
    </PageContainer>
  )
}
