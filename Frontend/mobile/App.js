import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { MobileHubScreen } from './src/screens/MobileHubScreen';
import { MobileLoginScreen } from './src/screens/MobileLoginScreen';
import { CustomerAppScreen } from './src/screens/CustomerAppScreen';
import { CourierAppScreen } from './src/screens/CourierAppScreen';
import { registerDevicePushToken } from './src/services/pushNotificationService';

export default function App() {
  const [session, setSession] = useState(null);
  const [pushStatus, setPushStatus] = useState('idle');

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
      {session.role === 'customer' ? (
        <CustomerAppScreen session={session} pushStatus={pushStatus} onLogout={() => setSession(null)} />
      ) : session.role === 'courier' ? (
        <CourierAppScreen session={session} pushStatus={pushStatus} onLogout={() => setSession(null)} />
      ) : (
        <MobileHubScreen
          initialRole={session.role}
          operatorName={session.name}
          onLogout={() => setSession(null)}
        />
      )}
    </>
  );
}
