import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { MobileHubScreen } from './src/screens/MobileHubScreen';
import { MobileLoginScreen } from './src/screens/MobileLoginScreen';
import { CustomerAppScreen } from './src/screens/CustomerAppScreen';
import { CourierAppScreen } from './src/screens/CourierAppScreen';
import { registerDevicePushToken } from './src/services/pushNotificationService';

export default function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    if (!session) {
      return;
    }

    registerDevicePushToken(session).catch(() => {
      // Push is opportunistic; realtime in-app updates still work without it.
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
        <CustomerAppScreen session={session} onLogout={() => setSession(null)} />
      ) : session.role === 'courier' ? (
        <CourierAppScreen session={session} onLogout={() => setSession(null)} />
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
