import { useState } from 'react'

const DEFAULT_DEV_USER_ID = import.meta.env.VITE_DEV_RESTAURANT_USER_ID ?? ''
const DEFAULT_TOKEN = import.meta.env.VITE_AUTH_BEARER_TOKEN ?? ''
const DEFAULT_RESTAURANT_ID = import.meta.env.VITE_DEV_RESTAURANT_ID ?? ''

export function RestaurantLoginScreen({ onLogin }) {
  const [email, setEmail] = useState('manager@fastbite.pt')
  const [password, setPassword] = useState('********')
  const [restaurant, setRestaurant] = useState('Centro')
  const [devUserId, setDevUserId] = useState(DEFAULT_DEV_USER_ID)
  const [restaurantId, setRestaurantId] = useState(DEFAULT_RESTAURANT_ID)
  const [token, setToken] = useState(DEFAULT_TOKEN)

  function handleSubmit(event) {
    event.preventDefault()
    const operatorName = email.split('@')[0] || 'manager'

    onLogin({
      operatorName,
      restaurant,
      devUserId: devUserId.trim(),
      restaurantId: restaurantId.trim(),
      token: token.trim(),
    })
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
          <label>
            Unidade
            <select value={restaurant} onChange={(event) => setRestaurant(event.target.value)}>
              <option value="Centro">Pizzaria do Centro</option>
              <option value="Norte">Pizzaria Norte</option>
              <option value="Sul">Pizzaria Sul</option>
            </select>
          </label>
          <label>
            Dev User ID (opcional)
            <input
              value={devUserId}
              onChange={(event) => setDevUserId(event.target.value)}
              placeholder="uuid do manager"
            />
          </label>
          <label>
            Restaurant ID (opcional)
            <input
              value={restaurantId}
              onChange={(event) => setRestaurantId(event.target.value)}
              placeholder="uuid do restaurante"
            />
          </label>
          <label>
            Bearer token (opcional)
            <input
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="jwt"
            />
          </label>

          <button type="submit" className="rb-primary">
            Entrar
          </button>
        </form>
      </div>
    </section>
  )
}
