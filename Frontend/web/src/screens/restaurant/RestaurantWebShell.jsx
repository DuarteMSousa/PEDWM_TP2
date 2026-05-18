import { useMemo, useState } from 'react'
import { PageContainer } from '../../components/layout/PageContainer'
import { RESTAURANT_VIEWS } from '../../features/restaurant/views'
import { RestaurantSideNav } from '../../features/restaurant/components/RestaurantSideNav'
import { RestaurantLoginScreen } from '../../features/restaurant/screens/RestaurantLoginScreen'

export function RestaurantWebShell() {
  const [activeViewId, setActiveViewId] = useState('dashboard')
  const [session, setSession] = useState(null)
  const [selectedOrderId, setSelectedOrderId] = useState('')

  const activeView = useMemo(
    () => RESTAURANT_VIEWS.find((view) => view.id === activeViewId) ?? RESTAURANT_VIEWS[0],
    [activeViewId],
  )
  const ActiveScreen = activeView.Component

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
