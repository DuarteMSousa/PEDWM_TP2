import { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { MobileLoginScreen } from './src/screens/MobileLoginScreen';
import { CustomerAppScreen } from './src/screens/CustomerAppScreen';
import { CourierAppScreen } from './src/screens/CourierAppScreen';
import { registerDevicePushToken } from './src/services/pushNotificationService';
import { ErrorBoundary } from './src/components/common/ErrorBoundary';

const SESSION_STORAGE_KEY = 'fastbite_mobile_session';

export default function App() {
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  );
}

function AppInner() {
  const [session, setSession] = useState(null);
  const [isHydrating, setIsHydrating] = useState(true);
  const [pushStatus, setPushStatus] = useState('idle');
  const [pendingDeepLink, setPendingDeepLink] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function hydrateSession() {
      try {
        const raw = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
        if (!isMounted) return;
        if (raw) {
          setSession(JSON.parse(raw));
        }
      } catch {
        if (isMounted) {
          setSession(null);
        }
      } finally {
        if (isMounted) {
          setIsHydrating(false);
        }
      }
    }

    hydrateSession();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (isHydrating) return;

    if (!session) {
      AsyncStorage.removeItem(SESSION_STORAGE_KEY).catch(() => {});
      return;
    }

    AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session)).catch(() => {});
  }, [isHydrating, session]);

  useEffect(() => {
    if (!session) {
      setPushStatus('idle');
      return;
    }

    registerDevicePushToken(session)
      .then((result) => {
        setPushStatus(result ? 'registered' : 'permission_denied');
      })
      .catch(() => {
        setPushStatus('error');
      });
  }, [session]);

  // Deep link: ao tocar numa push notification, abrir tracking do pedido referido.
  useEffect(() => {
    function handleNotificationResponse(response) {
      const data = response?.notification?.request?.content?.data ?? {};
      const orderId = data.orderId ?? data.order_id ?? null;
      const target = data.target ?? data.screen ?? null;
      if (!orderId) return;

      setPendingDeepLink({
        target: target || 'tracking',
        orderId,
        receivedAt: Date.now(),
      });
    }

    const subscription = Notifications.addNotificationResponseReceivedListener(
      handleNotificationResponse,
    );

    // Caso a app abra a partir de notificacao (cold start).
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) handleNotificationResponse(response);
      })
      .catch(() => {});

    return () => {
      subscription.remove();
    };
  }, []);

  function consumeDeepLink() {
    setPendingDeepLink(null);
  }

  if (isHydrating) {
    return (
      <>
        <StatusBar style="dark" />
      </>
    );
  }

  if (!session) {
    return (
      <>
        <StatusBar style="light" />
        <MobileLoginScreen onLogin={setSession} />
      </>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      {session.role === 'courier' ? (
        <CourierAppScreen
          session={session}
          pushStatus={pushStatus}
          onLogout={() => setSession(null)}
          deepLink={pendingDeepLink}
          onConsumeDeepLink={consumeDeepLink}
        />
      ) : (
        <CustomerAppScreen
          session={session}
          pushStatus={pushStatus}
          onLogout={() => setSession(null)}
          deepLink={pendingDeepLink}
          onConsumeDeepLink={consumeDeepLink}
        />
      )}
    </>
  );
}
