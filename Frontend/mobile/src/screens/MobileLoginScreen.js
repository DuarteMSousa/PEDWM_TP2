import { useEffect, useState } from 'react'
import { Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native'

const DEFAULT_CUSTOMER_ID = process.env.EXPO_PUBLIC_DEV_CUSTOMER_USER_ID ?? ''
const DEFAULT_COURIER_ID = process.env.EXPO_PUBLIC_DEV_COURIER_USER_ID ?? ''
const DEFAULT_TOKEN = process.env.EXPO_PUBLIC_AUTH_BEARER_TOKEN ?? ''

export function MobileLoginScreen({ onLogin }) {
  const [email, setEmail] = useState('cliente@fastbite.pt')
  const [password, setPassword] = useState('********')
  const [role, setRole] = useState('customer')
  const [devUserId, setDevUserId] = useState(DEFAULT_CUSTOMER_ID)
  const [token, setToken] = useState(DEFAULT_TOKEN)

  useEffect(() => {
    setDevUserId(role === 'customer' ? DEFAULT_CUSTOMER_ID : DEFAULT_COURIER_ID)
  }, [role])

  function handleLogin() {
    const name = email.split('@')[0] || (role === 'customer' ? 'cliente' : 'estafeta')
    onLogin({
      name,
      role,
      devUserId: devUserId.trim(),
      token: token.trim(),
    })
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.brand}>FastBite</Text>
        <Text style={styles.subtitle}>Entrar na sua conta</Text>

        <View style={styles.roleRow}>
          <RoleButton label="Cliente" active={role === 'customer'} onPress={() => setRole('customer')} />
          <RoleButton label="Estafeta" active={role === 'courier'} onPress={() => setRole('courier')} />
        </View>

        <View style={styles.formCard}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            placeholder="cliente@fastbite.pt"
            placeholderTextColor="#95a5c0"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            placeholder="********"
            placeholderTextColor="#95a5c0"
          />

          <Text style={styles.label}>Dev User ID (opcional)</Text>
          <TextInput
            style={styles.input}
            autoCapitalize="none"
            value={devUserId}
            onChangeText={setDevUserId}
            placeholder="uuid do utilizador"
            placeholderTextColor="#95a5c0"
          />

          <Text style={styles.label}>Bearer token (opcional)</Text>
          <TextInput
            style={styles.input}
            autoCapitalize="none"
            value={token}
            onChangeText={setToken}
            placeholder="jwt"
            placeholderTextColor="#95a5c0"
          />

          <Pressable style={styles.loginBtn} onPress={handleLogin}>
            <Text style={styles.loginBtnText}>Entrar</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  )
}

function RoleButton({ label, active, onPress }) {
  return (
    <Pressable style={[styles.roleBtn, active ? styles.roleBtnActive : null]} onPress={onPress}>
      <Text style={[styles.roleBtnText, active ? styles.roleBtnTextActive : null]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f2f4f7',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  brand: {
    color: '#2f6fe9',
    fontSize: 36,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    textAlign: 'center',
    color: '#64748b',
    fontSize: 16,
  },
  roleRow: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  roleBtn: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 999,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  roleBtnActive: {
    borderColor: '#3278ee',
    backgroundColor: '#eaf2ff',
  },
  roleBtnText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
  },
  roleBtnTextActive: {
    color: '#1d4ed8',
  },
  formCard: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    backgroundColor: '#fff',
    padding: 16,
  },
  label: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d5dce7',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#0f172a',
    fontSize: 15,
  },
  loginBtn: {
    marginTop: 16,
    borderRadius: 12,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3278ee',
  },
  loginBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },
})
