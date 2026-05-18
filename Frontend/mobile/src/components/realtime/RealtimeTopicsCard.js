import { useEffect, useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import {
  subscribeToChatTopic,
  subscribeToUserNotificationsTopic,
} from '../../services/realtime/topicsRealtime'
import { disconnectEchoClient } from '../../services/realtime/echoClient'

const DEFAULT_CHAT_ID = process.env.EXPO_PUBLIC_REALTIME_CHAT_ID ?? ''
const DEFAULT_USER_ID = process.env.EXPO_PUBLIC_REALTIME_USER_ID ?? ''
const AUTH_TOKEN = process.env.EXPO_PUBLIC_AUTH_BEARER_TOKEN ?? ''
const DEV_USER_ID = process.env.EXPO_PUBLIC_DEV_BROADCAST_USER_ID ?? ''
const MAX_ITEMS = 5

function prependLimited(items, nextItem) {
  return [nextItem, ...items].slice(0, MAX_ITEMS)
}

function resolveTimestamp(payload) {
  return payload?.timestamp ?? payload?.sentAt ?? payload?.recordedAt ?? new Date().toISOString()
}

export function RealtimeTopicsCard() {
  const [chatId, setChatId] = useState(DEFAULT_CHAT_ID)
  const [userId, setUserId] = useState(DEFAULT_USER_ID)
  const [status, setStatus] = useState('offline')
  const [isListening, setIsListening] = useState(false)
  const [chatEvents, setChatEvents] = useState([])
  const [notificationEvents, setNotificationEvents] = useState([])

  const canStart = useMemo(() => chatId.trim() && userId.trim(), [chatId, userId])

  useEffect(() => {
    if (!isListening) {
      setStatus('offline')
      return undefined
    }

    if (!canStart) {
      setStatus('missing-config')
      setIsListening(false)
      return undefined
    }

    setStatus('connecting')

    try {
      const unsubscribeChat = subscribeToChatTopic({
        chatId: chatId.trim(),
        authToken: AUTH_TOKEN,
        devUserId: DEV_USER_ID,
        onMessage: (payload) => {
          setStatus('live')
          setChatEvents((current) =>
            prependLimited(current, {
              id: payload?.eventId ?? `${Date.now()}-${Math.random()}`,
              title: payload?.content ?? 'Nova mensagem',
              meta: `sender ${payload?.senderUserId ?? 'desconhecido'}`,
              at: resolveTimestamp(payload),
            }),
          )
        },
        onError: () => setStatus('error'),
      })

      const unsubscribeNotifications = subscribeToUserNotificationsTopic({
        userId: userId.trim(),
        authToken: AUTH_TOKEN,
        devUserId: DEV_USER_ID,
        onNotification: (payload) => {
          setStatus('live')
          setNotificationEvents((current) =>
            prependLimited(current, {
              id: payload?.eventId ?? payload?.notificationId ?? `${Date.now()}-${Math.random()}`,
              title: payload?.title ?? payload?.type ?? 'Notificacao',
              meta: payload?.message ?? 'Sem descricao',
              at: resolveTimestamp(payload),
            }),
          )
        },
        onError: () => setStatus('error'),
      })

      return () => {
        unsubscribeChat()
        unsubscribeNotifications()
        disconnectEchoClient()
      }
    } catch {
      setStatus('error')
      setIsListening(false)
      return undefined
    }
  }, [canStart, chatId, isListening, userId])

  function toggleListening() {
    if (isListening) {
      setIsListening(false)
      return
    }

    setChatEvents([])
    setNotificationEvents([])
    setIsListening(true)
  }

  const statusLabel =
    status === 'live'
      ? 'AO VIVO'
      : status === 'connecting'
        ? 'A ligar'
        : status === 'missing-config'
          ? 'Faltam IDs'
          : status === 'error'
            ? 'Erro'
            : 'Offline'

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Realtime de chat e notificacoes</Text>
          <Text style={styles.subtitle}>Topicos privados com eventos push sem refresh.</Text>
        </View>
        <View style={[styles.statusPill, status === 'live' ? styles.statusLive : styles.statusWarn]}>
          <Text style={[styles.statusLabel, status === 'live' ? styles.statusLabelLive : styles.statusLabelWarn]}>
            {statusLabel}
          </Text>
        </View>
      </View>

      <View style={styles.formRow}>
        <View style={styles.formGroup}>
          <Text style={styles.inputLabel}>Chat ID</Text>
          <TextInput
            style={styles.input}
            autoCapitalize="none"
            value={chatId}
            onChangeText={setChatId}
            placeholder="uuid do chat"
            placeholderTextColor="#9aa7ba"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.inputLabel}>User ID</Text>
          <TextInput
            style={styles.input}
            autoCapitalize="none"
            value={userId}
            onChangeText={setUserId}
            placeholder="uuid do user"
            placeholderTextColor="#9aa7ba"
          />
        </View>
      </View>

      <Pressable
        style={[styles.listenButton, !canStart ? styles.listenButtonDisabled : null]}
        disabled={!canStart}
        onPress={toggleListening}
      >
        <Text style={styles.listenButtonText}>{isListening ? 'Parar escuta' : 'Iniciar escuta'}</Text>
      </Pressable>

      <View style={styles.eventsGrid}>
        <View style={styles.eventsColumn}>
          <Text style={styles.eventsTitle}>CHAT_MESSAGE_SENT</Text>
          {chatEvents.length === 0 ? (
            <Text style={styles.emptyText}>Sem eventos</Text>
          ) : (
            chatEvents.map((item) => (
              <View key={item.id} style={styles.eventItem}>
                <Text style={styles.eventTitle}>{item.title}</Text>
                <Text style={styles.eventMeta}>{item.meta}</Text>
                <Text style={styles.eventMeta}>{item.at}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.eventsColumn}>
          <Text style={styles.eventsTitle}>USER_NOTIFICATION_CREATED</Text>
          {notificationEvents.length === 0 ? (
            <Text style={styles.emptyText}>Sem eventos</Text>
          ) : (
            notificationEvents.map((item) => (
              <View key={item.id} style={styles.eventItem}>
                <Text style={styles.eventTitle}>{item.title}</Text>
                <Text style={styles.eventMeta}>{item.meta}</Text>
                <Text style={styles.eventMeta}>{item.at}</Text>
              </View>
            ))
          )}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#d7dee8',
    borderRadius: 14,
    backgroundColor: '#ffffff',
    padding: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '800',
  },
  subtitle: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 2,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  statusLive: {
    backgroundColor: '#e7f8ef',
  },
  statusWarn: {
    backgroundColor: '#fff4dd',
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusLabelLive: {
    color: '#137d3b',
  },
  statusLabelWarn: {
    color: '#9f6d00',
  },
  formRow: {
    marginTop: 10,
    gap: 8,
  },
  formGroup: {
    gap: 4,
  },
  inputLabel: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d5dce7',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#0f172a',
    fontSize: 13,
  },
  listenButton: {
    marginTop: 10,
    backgroundColor: '#2563eb',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
  },
  listenButtonDisabled: {
    opacity: 0.5,
  },
  listenButtonText: {
    color: '#ffffff',
    fontWeight: '800',
  },
  eventsGrid: {
    marginTop: 12,
    gap: 10,
  },
  eventsColumn: {
    borderWidth: 1,
    borderColor: '#e4e9f1',
    borderRadius: 10,
    backgroundColor: '#f9fbfe',
    padding: 10,
  },
  eventsTitle: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '800',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 8,
  },
  eventItem: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e4e9f1',
    paddingTop: 8,
  },
  eventTitle: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '700',
  },
  eventMeta: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
  },
})
