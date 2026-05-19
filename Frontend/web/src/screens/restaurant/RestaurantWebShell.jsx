import { useEffect, useMemo, useState } from 'react'
import { PageContainer } from '../../components/layout/PageContainer'
import { RESTAURANT_VIEWS } from '../../features/restaurant/views'
import { RestaurantSideNav } from '../../features/restaurant/components/RestaurantSideNav'
import { RestaurantLoginScreen } from '../../features/restaurant/screens/RestaurantLoginScreen'
import { ConfirmDialog } from '../../components/common/ConfirmDialog'
import { disconnectEchoClient } from '../../services/realtime/echoClient'

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
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)

  const userType = session?.userType ?? null
  const isChainManager = userType === 'CHAIN_MANAGER'

  const activeView = useMemo(() => {
    const fallback = RESTAURANT_VIEWS[0]
    const candidate = RESTAURANT_VIEWS.find((view) => view.id === activeViewId)
    if (!candidate) return fallback
    if (candidate.chainOnly && !isChainManager) return fallback
    return candidate
  }, [activeViewId, isChainManager])
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
    setLogoutConfirmOpen(true)
  }

  function confirmLogout() {
    disconnectEchoClient()
    setSession(null)
    setSelectedOrderId('')
    setLogoutConfirmOpen(false)
  }

  if (!session) {
    return (
      <PageContainer restaurantUnit="Acesso de staff">
        <RestaurantLoginScreen onLogin={handleLogin} />
      </PageContainer>
    )
  }

  return (
    <PageContainer
      restaurantUnit={`Unidade ${session.restaurant}`}
      topbarActions={
        <button
          type="button"
          className={`rb-store-profile-btn ${activeView.id === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveViewId('profile')}
          aria-label="Abrir perfil do restaurante"
          title="Perfil do restaurante"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M4 10h16l-1.1-5.5A1.9 1.9 0 0 0 17 3H7a1.9 1.9 0 0 0-1.9 1.5L4 10Z" />
            <path d="M5 10v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9" />
            <path d="M9 21v-7h6v7" />
            <path d="M4 10c.6 1.3 2.7 1.3 3.3 0 .6 1.3 2.7 1.3 3.3 0 .6 1.3 2.7 1.3 3.3 0 .6 1.3 2.7 1.3 3.3 0 .6 1.3 2.7 1.3 3.3 0" />
          </svg>
        </button>
      }
    >
      <div className="rb-shell">
        <RestaurantSideNav
          views={RESTAURANT_VIEWS}
          activeViewId={activeView.id}
          onSelect={setActiveViewId}
          operatorName={session.operatorName}
          onLogout={handleLogout}
          session={session}
        />
        <section className="rb-main">
          <ActiveScreen
            session={session}
            selectedOrderId={selectedOrderId}
            onSelectOrder={setSelectedOrderId}
            onNavigate={setActiveViewId}
            onSessionChange={setSession}
          />
        </section>
      </div>

      <ConfirmDialog
        open={logoutConfirmOpen}
        title="Terminar sessao?"
        description="Vais sair da conta. Tera de fazer login outra vez."
        confirmLabel="Sair"
        destructive
        onCancel={() => setLogoutConfirmOpen(false)}
        onConfirm={confirmLogout}
      />
    </PageContainer>
  )
}
