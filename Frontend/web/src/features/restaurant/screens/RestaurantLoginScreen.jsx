import { useState } from 'react'
import {
  bootstrapRestaurantSession,
  registerRestaurantUser,
} from '../../../services/restaurantOpsService'

const DEFAULT_TOKEN = import.meta.env.VITE_AUTH_BEARER_TOKEN ?? ''

export function RestaurantLoginScreen({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [registerMode, setRegisterMode] = useState(false)
  const [registerForm, setRegisterForm] = useState({
    managerName: '',
    chainName: '',
    restaurantName: '',
    openingHours: '',
    closingHours: '',
    deliveryRadius: '',
    street: '',
    city: '',
    postalCode: '',
    country: '',
    latitude: '',
    longitude: '',
  })
  const [loadingAction, setLoadingAction] = useState('')
  const [errorText, setErrorText] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    if (registerMode) {
      await handleRegister()
      return
    }

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

  function updateRegisterField(field, value) {
    setRegisterForm((current) => ({ ...current, [field]: value }))
  }

  async function handleRegister() {
    try {
      setLoadingAction('register')
      const session = await registerRestaurantUser({
        email,
        password,
        managerName: registerForm.managerName,
        chainName: registerForm.chainName,
        restaurant: registerForm.restaurantName,
        openingHours: registerForm.openingHours,
        closingHours: registerForm.closingHours,
        deliveryRadius: registerForm.deliveryRadius,
        street: registerForm.street,
        city: registerForm.city,
        postalCode: registerForm.postalCode,
        country: registerForm.country,
        latitude: registerForm.latitude,
        longitude: registerForm.longitude,
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

  function toggleRegisterMode() {
    setRegisterMode((current) => !current)
    setErrorText('')
  }

  return (
    <section className="rb-login-wrap">
      <div className="rb-login-card">
        <h2>Entrar no painel do restaurante</h2>
        <p>
          {registerMode
            ? 'Cria a conta e associa logo a cadeia e o restaurante.'
            : 'Utiliza email e password. O restaurante e resolvido automaticamente.'}
        </p>

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

          {registerMode ? (
            <div className="rb-register-fields">
              <label>
                Nome do gestor
                <input
                  value={registerForm.managerName}
                  onChange={(event) => updateRegisterField('managerName', event.target.value)}
                  type="text"
                  placeholder="Gestor FastBite"
                  required
                />
              </label>
              <label>
                Cadeia
                <input
                  value={registerForm.chainName}
                  onChange={(event) => updateRegisterField('chainName', event.target.value)}
                  type="text"
                  placeholder="FastBite"
                  required
                />
              </label>
              <label>
                Restaurante
                <input
                  value={registerForm.restaurantName}
                  onChange={(event) => updateRegisterField('restaurantName', event.target.value)}
                  type="text"
                  placeholder="FastBite Lisboa Centro"
                  required
                />
              </label>
              <div className="rb-login-grid">
                <label>
                  Abertura
                  <input
                    value={registerForm.openingHours}
                    onChange={(event) => updateRegisterField('openingHours', event.target.value)}
                    type="time"
                    placeholder="09:00"
                    required
                  />
                </label>
                <label>
                  Fecho
                  <input
                    value={registerForm.closingHours}
                    onChange={(event) => updateRegisterField('closingHours', event.target.value)}
                    type="time"
                    placeholder="23:00"
                    required
                  />
                </label>
              </div>
              <label>
                Raio de entrega (km)
                <input
                  value={registerForm.deliveryRadius}
                  onChange={(event) => updateRegisterField('deliveryRadius', event.target.value)}
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="7"
                  required
                />
              </label>
              <label>
                Rua
                <input
                  value={registerForm.street}
                  onChange={(event) => updateRegisterField('street', event.target.value)}
                  type="text"
                  placeholder="Rua Principal 1"
                  required
                />
              </label>
              <div className="rb-login-grid">
                <label>
                  Cidade
                  <input
                    value={registerForm.city}
                    onChange={(event) => updateRegisterField('city', event.target.value)}
                    type="text"
                    placeholder="Lisboa"
                    required
                  />
                </label>
                <label>
                  Codigo postal
                  <input
                    value={registerForm.postalCode}
                    onChange={(event) => updateRegisterField('postalCode', event.target.value)}
                    type="text"
                    placeholder="1000-001"
                    required
                  />
                </label>
              </div>
              <div className="rb-login-grid">
                <label>
                  Pais
                  <input
                    value={registerForm.country}
                    onChange={(event) => updateRegisterField('country', event.target.value)}
                    type="text"
                    placeholder="PT"
                    required
                  />
                </label>
                <label>
                  Latitude
                  <input
                    value={registerForm.latitude}
                    onChange={(event) => updateRegisterField('latitude', event.target.value)}
                    type="number"
                    step="0.000001"
                    placeholder="38.7223"
                    required
                  />
                </label>
              </div>
              <label>
                Longitude
                <input
                  value={registerForm.longitude}
                  onChange={(event) => updateRegisterField('longitude', event.target.value)}
                  type="number"
                  step="0.000001"
                  placeholder="-9.1393"
                  required
                />
              </label>
            </div>
          ) : null}

          <button type="submit" className="rb-primary" disabled={loadingAction !== ''}>
            {loadingAction === 'register'
              ? 'A criar conta...'
              : loadingAction === 'login'
                ? 'A entrar...'
                : registerMode
                  ? 'Criar conta'
                  : 'Entrar'}
          </button>
          <button
            type="button"
            className="rb-icon-btn"
            onClick={toggleRegisterMode}
            disabled={loadingAction !== ''}
          >
            {registerMode ? 'Voltar ao login' : 'Criar conta'}
          </button>
        </form>
        {errorText ? <p className="rb-chat-error">{errorText}</p> : null}
      </div>
    </section>
  )
}
