import { useState } from 'react'

export function RestaurantLoginScreen({ onLogin }) {
  const [email, setEmail] = useState('manager@fastbite.pt')
  const [password, setPassword] = useState('********')
  const [restaurant, setRestaurant] = useState('Centro')

  function handleSubmit(event) {
    event.preventDefault()
    const operatorName = email.split('@')[0] || 'manager'
    onLogin({ operatorName, restaurant })
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

          <button type="submit" className="rb-primary">
            Entrar
          </button>
        </form>
      </div>
    </section>
  )
}
