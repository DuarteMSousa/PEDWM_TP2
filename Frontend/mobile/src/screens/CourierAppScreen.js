import { useMemo, useState } from 'react'
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native'

const DELIVERY = {
  orderId: '#4526',
  restaurant: 'Pizzaria do Centro',
  pickupAddress: 'Rua do Comércio, 45, Porto',
  customer: 'Sofia Martins',
  dropoffAddress: 'Avenida dos Aliados, 102, Porto',
  distanceKm: 2.3,
  estimatedMin: 15,
  payment: 28.5,
  earning: 4.2,
  totalItems: 3,
}

export function CourierAppScreen({ onLogout }) {
  const [isOnline, setIsOnline] = useState(true)
  const [phase, setPhase] = useState('offer')
  const [toast, setToast] = useState('')

  const isOffer = phase === 'offer'
  const isPickup = phase === 'pickup'
  const isCollected = phase === 'collected'
  const isTransit = phase === 'in_transit'
  const isCompleted = phase === 'completed'
  const isSearching = phase === 'searching'

  const mainButton = useMemo(() => {
    if (isPickup) return { label: 'Cheguei ao Restaurante', action: () => toCollected() }
    if (isCollected) return { label: 'Encomenda Recolhida', action: () => toTransit() }
    if (isTransit) return { label: 'Entregue com Sucesso', action: () => toCompleted() }
    if (isCompleted) return { label: 'Procurar novas entregas', action: () => toSearching() }
    return null
  }, [isPickup, isCollected, isTransit, isCompleted])

  function toggleOnline() {
    setIsOnline((current) => !current)
  }

  function acceptOffer() {
    setPhase('pickup')
    setToast('Entrega aceite!')
  }

  function rejectOffer() {
    setPhase('searching')
    setToast('À procura de entregas...')
  }

  function toCollected() {
    setPhase('collected')
    setToast('Encomenda recolhida')
  }

  function toTransit() {
    setPhase('in_transit')
    setToast('A caminho do cliente')
  }

  function toCompleted() {
    setPhase('completed')
    setToast('Entrega concluída! Ganhou €4.20')
  }

  function toSearching() {
    setPhase('searching')
    setToast('À procura de entregas...')
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.screen}>
        <View style={styles.header}>
          {toast ? (
            <View style={styles.toast}>
              <Text style={styles.toastText}>✔ {toast}</Text>
            </View>
          ) : null}

          <View style={styles.headerTop}>
            <View style={styles.brandWrap}>
              <View style={styles.brandIcon}>
                <Text style={styles.brandIconText}>🚴</Text>
              </View>
              <View>
                <Text style={styles.brand}>FastBite</Text>
                <Text style={styles.brandSub}>Estafeta</Text>
              </View>
            </View>
            <Pressable
              style={[styles.onlineBtn, !isOnline ? styles.onlineBtnOff : null]}
              onPress={toggleOnline}
            >
              <Text style={[styles.onlineBtnText, !isOnline ? styles.onlineBtnTextOff : null]}>
                {isOnline ? 'Online' : 'Offline'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Hoje</Text>
              <Text style={styles.metricValue}>8</Text>
              <Text style={styles.metricSub}>entregas</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Ganhos Hoje</Text>
              <Text style={styles.metricValue}>€42.50</Text>
              <Text style={styles.metricSub}>+€12 vs ontem</Text>
            </View>
          </View>

          {(isPickup || isCollected || isTransit || isCompleted) && (
            <View style={styles.earningWrap}>
              <Text style={styles.earningLabel}>Ganhar nesta entrega</Text>
              <Text style={styles.earningValue}>€{DELIVERY.earning.toFixed(2)}</Text>
            </View>
          )}
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, mainButton ? styles.contentWithBottom : null]}
          showsVerticalScrollIndicator={false}
        >
          {(!isOnline || isOffer || isSearching) && (
            <>
              <Text style={styles.sectionTitle}>
                {isOnline ? 'Entregas Disponíveis' : 'Está Offline'}
              </Text>

              {!isOnline && (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyIcon}>🚲</Text>
                  <Text style={styles.emptyTitle}>Está offline</Text>
                  <Text style={styles.emptySub}>Fique online para receber entregas</Text>
                </View>
              )}

              {isSearching && (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyIcon}>🕒</Text>
                  <Text style={styles.emptyTitle}>À procura de entregas...</Text>
                  <Text style={styles.emptySub}>Novas entregas aparecerão aqui</Text>
                </View>
              )}

              {(isOffer || !isOnline) && <OfferCard onReject={rejectOffer} onAccept={acceptOffer} />}
            </>
          )}

          {isPickup ? <PickupCard /> : null}
          {isCollected || isTransit ? <DeliverCard /> : null}
          {isCompleted ? <DeliverySummaryCard /> : null}
        </ScrollView>

        <View style={styles.bottomBar}>
          {mainButton ? (
            <Pressable style={styles.mainBtn} onPress={mainButton.action}>
              <Text style={styles.mainBtnText}>{mainButton.label}</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.secondaryBtn} onPress={onLogout}>
              <Text style={styles.secondaryBtnText}>Sair</Text>
            </Pressable>
          )}
        </View>
      </View>
    </SafeAreaView>
  )
}

function OfferCard({ onReject, onAccept }) {
  return (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <Text style={styles.offerId}>{DELIVERY.orderId}</Text>
        <View>
          <Text style={styles.offerEarning}>€{DELIVERY.earning.toFixed(2)}</Text>
          <Text style={styles.offerGain}>ganhar</Text>
        </View>
      </View>
      <Text style={styles.offerRestaurant}>{DELIVERY.restaurant}</Text>

      <PointRow title="Recolher em:" value={DELIVERY.pickupAddress} />
      <PointRow title="Entregar em:" value={DELIVERY.dropoffAddress} />

      <View style={styles.detailsRow}>
        <StatMini label="Distância" value={`${DELIVERY.distanceKm.toFixed(1)} km`} />
        <StatMini label="Tempo est." value={`${DELIVERY.estimatedMin} min`} />
        <StatMini label="Pagamento" value={`€${DELIVERY.payment.toFixed(2)}`} />
      </View>

      <View style={styles.actionsRow}>
        <Pressable style={styles.rejectBtn} onPress={onReject}>
          <Text style={styles.rejectBtnText}>Rejeitar</Text>
        </Pressable>
        <Pressable style={styles.acceptBtn} onPress={onAccept}>
          <Text style={styles.acceptBtnText}>Aceitar</Text>
        </Pressable>
      </View>
    </View>
  )
}

function PickupCard() {
  return (
    <>
      <View style={styles.card}>
        <JobHeading icon="📦" title="Recolher encomenda" subtitle="Restaurante" />
        <Text style={styles.jobMetaLabel}>Local</Text>
        <Text style={styles.jobTitleValue}>{DELIVERY.restaurant}</Text>
        <Text style={styles.jobAddress}>{DELIVERY.pickupAddress}</Text>
        <CallNavRow />
      </View>
      <DeliverySummaryCard />
    </>
  )
}

function DeliverCard() {
  return (
    <>
      <View style={styles.card}>
        <JobHeading icon="📍" title="Entregar ao cliente" subtitle={DELIVERY.customer} />
        <Text style={styles.jobMetaLabel}>Morada</Text>
        <Text style={styles.jobAddress}>{DELIVERY.dropoffAddress}</Text>
        <View style={styles.detailsRow}>
          <StatMini label="Distância" value={`${DELIVERY.distanceKm.toFixed(1)} km`} />
          <StatMini label="Pagamento" value={`€${DELIVERY.payment.toFixed(2)}`} />
        </View>
        <CallNavRow />
      </View>
      <DeliverySummaryCard />
    </>
  )
}

function DeliverySummaryCard() {
  return (
    <View style={styles.card}>
      <Text style={styles.summaryTitle}>Detalhes do pedido</Text>
      <SummaryRow label="Número do pedido" value={DELIVERY.orderId} />
      <SummaryRow label="Total de itens" value={`${DELIVERY.totalItems} itens`} />
      <SummaryRow label="Tempo estimado" value={`${DELIVERY.estimatedMin} min`} />
    </View>
  )
}

function JobHeading({ icon, title, subtitle }) {
  return (
    <View style={styles.jobHeading}>
      <Text style={styles.jobIcon}>{icon}</Text>
      <View>
        <Text style={styles.jobHeadingTitle}>{title}</Text>
        <Text style={styles.jobHeadingSub}>{subtitle}</Text>
      </View>
    </View>
  )
}

function PointRow({ title, value }) {
  return (
    <View style={styles.pointRow}>
      <Text style={styles.pointTitle}>{title}</Text>
      <Text style={styles.pointValue}>{value}</Text>
    </View>
  )
}

function StatMini({ label, value }) {
  return (
    <View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  )
}

function CallNavRow() {
  return (
    <View style={styles.callRow}>
      <Pressable style={styles.callBtn}>
        <Text style={styles.callBtnText}>Ligar</Text>
      </Pressable>
      <Pressable style={styles.navBtn}>
        <Text style={styles.navBtnText}>Navegar</Text>
      </Pressable>
    </View>
  )
}

function SummaryRow({ label, value }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f2f4f7',
  },
  screen: {
    flex: 1,
    backgroundColor: '#f2f4f7',
  },
  header: {
    backgroundColor: '#07bf4f',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  toast: {
    borderWidth: 1,
    borderColor: '#a7f3d0',
    backgroundColor: '#ecfdf5',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
  },
  toastText: {
    color: '#166534',
    fontSize: 14,
    fontWeight: '700',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandIcon: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandIconText: {
    fontSize: 18,
  },
  brand: {
    color: '#fff',
    fontSize: 34,
    fontWeight: '900',
    lineHeight: 36,
  },
  brandSub: {
    color: '#dcfce7',
    fontSize: 13,
    marginTop: 2,
  },
  onlineBtn: {
    borderWidth: 1.5,
    borderColor: '#fff',
    borderRadius: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  onlineBtnOff: {
    backgroundColor: 'transparent',
  },
  onlineBtnText: {
    color: '#0b9b3f',
    fontWeight: '800',
    fontSize: 16,
  },
  onlineBtnTextOff: {
    color: '#fff',
  },
  metricsRow: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    padding: 12,
  },
  metricLabel: {
    color: '#dcfce7',
    fontSize: 12,
    fontWeight: '700',
  },
  metricValue: {
    marginTop: 6,
    color: '#fff',
    fontSize: 34,
    fontWeight: '900',
    lineHeight: 36,
  },
  metricSub: {
    color: '#dcfce7',
    fontSize: 13,
    marginTop: 2,
  },
  earningWrap: {
    marginTop: 12,
    alignItems: 'center',
  },
  earningLabel: {
    color: '#e9fee8',
    fontSize: 14,
  },
  earningValue: {
    color: '#fff',
    fontSize: 42,
    fontWeight: '900',
    marginTop: 2,
  },
  content: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 16,
  },
  contentWithBottom: {
    paddingBottom: 92,
  },
  sectionTitle: {
    fontSize: 29,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
  },
  emptyCard: {
    borderWidth: 1,
    borderColor: '#e3e8ef',
    borderRadius: 14,
    backgroundColor: '#fff',
    paddingVertical: 24,
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyIcon: {
    fontSize: 36,
  },
  emptyTitle: {
    marginTop: 8,
    color: '#475569',
    fontSize: 20,
  },
  emptySub: {
    marginTop: 4,
    color: '#94a3b8',
    fontSize: 15,
  },
  card: {
    borderWidth: 1,
    borderColor: '#e4e7ec',
    borderRadius: 14,
    backgroundColor: '#fff',
    padding: 14,
    marginBottom: 12,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  offerId: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0f172a',
  },
  offerEarning: {
    color: '#0eac44',
    fontSize: 36,
    fontWeight: '900',
    textAlign: 'right',
  },
  offerGain: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'right',
  },
  offerRestaurant: {
    marginTop: 4,
    color: '#64748b',
    fontSize: 16,
  },
  pointRow: {
    marginTop: 10,
  },
  pointTitle: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
  },
  pointValue: {
    marginTop: 2,
    color: '#334155',
    fontSize: 16,
    lineHeight: 20,
  },
  detailsRow: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  statLabel: {
    color: '#64748b',
    fontSize: 12,
  },
  statValue: {
    marginTop: 2,
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
  },
  actionsRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 10,
  },
  rejectBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectBtnText: {
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 17,
  },
  acceptBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#07bf4f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 17,
  },
  jobHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  jobIcon: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: '#eff6ff',
    textAlign: 'center',
    textAlignVertical: 'center',
    lineHeight: 40,
    fontSize: 18,
  },
  jobHeadingTitle: {
    color: '#0f172a',
    fontSize: 17,
    fontWeight: '800',
  },
  jobHeadingSub: {
    marginTop: 1,
    color: '#64748b',
    fontSize: 13,
  },
  jobMetaLabel: {
    marginTop: 10,
    color: '#64748b',
    fontSize: 12,
  },
  jobTitleValue: {
    marginTop: 2,
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
  },
  jobAddress: {
    marginTop: 2,
    color: '#334155',
    fontSize: 16,
    lineHeight: 20,
  },
  callRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 10,
  },
  callBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callBtnText: {
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 17,
  },
  navBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#3278ee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 17,
  },
  summaryTitle: {
    color: '#0f172a',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  summaryLabel: {
    color: '#475569',
    fontSize: 14,
  },
  summaryValue: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
  },
  bottomBar: {
    borderTopWidth: 1,
    borderTopColor: '#d9dee7',
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
  },
  mainBtn: {
    borderRadius: 12,
    height: 48,
    backgroundColor: '#07bf4f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainBtnText: {
    color: '#fff',
    fontSize: 19,
    fontWeight: '900',
  },
  secondaryBtn: {
    borderRadius: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: '#334155',
    fontSize: 16,
    fontWeight: '700',
  },
})
