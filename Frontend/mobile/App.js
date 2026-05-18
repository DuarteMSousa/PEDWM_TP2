import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MobileLoginScreen } from './src/screens/MobileLoginScreen';
import { CustomerAppScreen } from './src/screens/CustomerAppScreen';
import { CourierAppScreen } from './src/screens/CourierAppScreen';
import { registerDevicePushToken } from './src/services/pushNotificationService';

const SESSION_STORAGE_KEY = 'fastbite_mobile_session';

export default function App() {
  const [session, setSession] = useState(null);
  const [isHydrating, setIsHydrating] = useState(true);
  const [pushStatus, setPushStatus] = useState('idle');

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
        <CourierAppScreen session={session} pushStatus={pushStatus} onLogout={() => setSession(null)} />
      ) : (
        <CustomerAppScreen session={session} pushStatus={pushStatus} onLogout={() => setSession(null)} />
      )}
    </>
  );
}
