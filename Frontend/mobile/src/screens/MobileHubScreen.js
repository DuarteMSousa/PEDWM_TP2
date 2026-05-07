import { useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { ScreenContainer } from '../components/layout/ScreenContainer'
import { CLIENT_VIEWS, COURIER_VIEWS } from '../features/mobileHub/views'
import { styles } from '../features/mobileHub/styles'
import { RoleSwitch } from '../features/mobileHub/components/RoleSwitch'
import { MobileViewTabs } from '../features/mobileHub/components/MobileViewTabs'

export function MobileHubScreen({ initialRole = 'customer', operatorName = 'operador', onLogout }) {
  const [role, setRole] = useState(initialRole)
  const [customerViewId, setCustomerViewId] = useState(CLIENT_VIEWS[0].id)
  const [courierViewId, setCourierViewId] = useState('courier-shift-start')

  const isCustomer = role === 'customer'
  const availableViews = isCustomer ? CLIENT_VIEWS : COURIER_VIEWS
  const activeViewId = isCustomer ? customerViewId : courierViewId

  const activeView = useMemo(
    () => availableViews.find((view) => view.id === activeViewId) ?? availableViews[0],
    [activeViewId, availableViews],
  )
  const ActiveScreen = activeView.Component

  function selectView(nextId) {
    if (isCustomer) {
      setCustomerViewId(nextId)
      return
    }

    setCourierViewId(nextId)
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>FastBite Mobile</Text>
        <Text style={styles.title}>Cliente e Estafeta</Text>
        <Text style={styles.subtitle}>
          Fluxos principais do ecossistema de encomendas, entrega e tracking em tempo real.
        </Text>
        <View style={styles.sessionRow}>
          <Text style={styles.sessionText}>
            Sessao: {operatorName} ({role === 'customer' ? 'Cliente' : 'Estafeta'})
          </Text>
          {onLogout ? (
            <Pressable style={styles.sessionButton} onPress={onLogout}>
              <Text style={styles.sessionButtonText}>Sair</Text>
            </Pressable>
          ) : null}
        </View>

        <RoleSwitch role={role} onChangeRole={setRole} />

        <MobileViewTabs views={availableViews} activeViewId={activeView.id} onSelect={selectView} />
        <ActiveScreen />
      </ScrollView>
    </ScreenContainer>
  )
}
