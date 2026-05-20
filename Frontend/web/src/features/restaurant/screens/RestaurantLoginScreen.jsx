import { useState } from 'react'
import { bootstrapRestaurantSession } from '../../../services/restaurantOpsService'

const DEFAULT_TOKEN = import.meta.env.VITE_AUTH_BEARER_TOKEN ?? ''

export function RestaurantLoginScreen({ onLogin }) {
  const [email, setEmail] = useState('')
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

  return (
    <section className="rb-login-wrap">
      <div className="rb-login-card">
        <h2>Entrar no painel do restaurante</h2>
        <p>Utiliza email e password. O restaurante e resolvido automaticamente.</p>

        <form className="rb-login-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              placeholder="manager@fastbite.pt"
              required
            />
          </label>
          <label>
            Password
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              placeholder="Password"
              required
            />
          </label>

          <button type="submit" className="rb-primary" disabled={loadingAction !== ''}>
            {loadingAction === 'login' ? 'A entrar...' : 'Entrar'}
          </button>
        </form>
        {errorText ? <p className="rb-chat-error">{errorText}</p> : null}
      </div>
    </section>
  )
}
