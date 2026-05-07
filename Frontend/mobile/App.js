import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { MobileHubScreen } from './src/screens/MobileHubScreen';
import { MobileLoginScreen } from './src/screens/MobileLoginScreen';
import { CustomerAppScreen } from './src/screens/CustomerAppScreen';
import { CourierAppScreen } from './src/screens/CourierAppScreen';

export default function App() {
  const [session, setSession] = useState(null);

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
        <CustomerAppScreen onLogout={() => setSession(null)} />
      ) : session.role === 'courier' ? (
        <CourierAppScreen onLogout={() => setSession(null)} />
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
