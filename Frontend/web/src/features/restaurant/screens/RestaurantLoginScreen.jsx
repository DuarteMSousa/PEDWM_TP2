import { useState } from 'react'
import {
  bootstrapRestaurantSession,
  registerRestaurantUser,
} from '../../../services/restaurantOpsService'

const DEFAULT_TOKEN = import.meta.env.VITE_AUTH_BEARER_TOKEN ?? ''

export function RestaurantLoginScreen({ onLogin }) {
  const [email, setEmail] = useState('manager@fastbite.pt')
  const [password, setPassword] = useState('')
  const [loadingAction, setLoadingAction] = useState('')
  const [errorText, setErrorText] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    try {
      setLoadingAction('login')
      const session = await bootstrapRestaurantSession({
        email,
        password,
        restaurant: '',
        token: DEFAULT_TOKEN,
      })
      setErrorText('')
      onLogin(session)
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setLoadingAction('')
    }
  }

  async function handleRegister() {
    try {
      setLoadingAction('register')
      const session = await registerRestaurantUser({
        email,
        password,
        restaurant: '',
        token: DEFAULT_TOKEN,
      })
      setErrorText('')
      onLogin(session)
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setLoadingAction('')
    }
  }

  return (
    <section className="rb-login-wrap">
      <div className="rb-login-card">
        <h2>Entrar no painel do restaurante</h2>
        <p>Utiliza as credenciais da loja para aceder ao dashboard operacional.</p>

        <form className="rb-login-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
          </label>
          <label>
            Password
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              required
            />
          </label>
          <button type="submit" className="rb-primary" disabled={loadingAction !== ''}>
            {loadingAction === 'login' ? 'A entrar...' : 'Entrar'}
          </button>
          <button
            type="button"
            className="rb-icon-btn"
            onClick={handleRegister}
            disabled={loadingAction !== ''}
          >
            {loadingAction === 'register' ? 'A criar conta...' : 'Criar conta'}
          </button>
        </form>
        {errorText ? <p className="rb-chat-error">{errorText}</p> : null}
      </div>
    </section>
  )
}
