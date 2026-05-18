import { useState } from 'react'
import { bootstrapRestaurantSession } from '../../../services/restaurantOpsService'

const DEFAULT_DEV_USER_ID = import.meta.env.VITE_DEV_RESTAURANT_USER_ID ?? ''
const DEFAULT_TOKEN = import.meta.env.VITE_AUTH_BEARER_TOKEN ?? ''
const DEFAULT_RESTAURANT_ID = import.meta.env.VITE_DEV_RESTAURANT_ID ?? ''

export function RestaurantLoginScreen({ onLogin }) {
  const [email, setEmail] = useState('manager@fastbite.pt')
  const [password, setPassword] = useState('********')
  const [loading, setLoading] = useState(false)
  const [errorText, setErrorText] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    try {
      setLoading(true)
      const session = await bootstrapRestaurantSession({
        email,
        restaurant: '',
        devUserId: DEFAULT_DEV_USER_ID,
        restaurantId: DEFAULT_RESTAURANT_ID,
        token: DEFAULT_TOKEN,
      })
      setErrorText('')
      onLogin(session)
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setLoading(false)
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
            />
          </label>
          <button type="submit" className="rb-primary" disabled={loading}>
            {loading ? 'A entrar...' : 'Entrar'}
          </button>
        </form>
        {errorText ? <p className="rb-chat-error">{errorText}</p> : null}
      </div>
    </section>
  )
}
