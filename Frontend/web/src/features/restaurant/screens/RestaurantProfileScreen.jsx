import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchChainRestaurants,
  fetchRestaurantChainProfile,
  fetchRestaurantProfile,
  updateRestaurantChainProfile,
  updateRestaurantProfile,
} from '../../../services/restaurantOpsService'

function restaurantToDraft(restaurant) {
  return {
    name: restaurant?.name ?? '',
    opening_hours: restaurant?.opening_hours ?? '',
    closing_hours: restaurant?.closing_hours ?? '',
    delivery_radius: restaurant?.delivery_radius != null ? String(restaurant.delivery_radius) : '',
    street: restaurant?.address?.street ?? '',
    city: restaurant?.address?.city ?? '',
    postal_code: restaurant?.address?.postal_code ?? '',
    country: restaurant?.address?.country ?? '',
    latitude: restaurant?.address?.latitude != null ? String(restaurant.address.latitude) : '',
    longitude: restaurant?.address?.longitude != null ? String(restaurant.address.longitude) : '',
  }
}

function ratingAverage(restaurant) {
  const count = Number(restaurant?.rating_count ?? 0)
  if (count <= 0) return '-'

  return (Number(restaurant.rating_sum ?? 0) / count).toFixed(2)
}

export function RestaurantProfileScreen({ session, onSessionChange }) {
  const [restaurants, setRestaurants] = useState([])
  const [selectedRestaurantId, setSelectedRestaurantId] = useState(session.restaurantId)
  const [restaurant, setRestaurant] = useState(null)
  const [restaurantDraft, setRestaurantDraft] = useState(() => restaurantToDraft(null))
  const [chain, setChain] = useState(null)
  const [chainNameDraft, setChainNameDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingRestaurant, setSavingRestaurant] = useState(false)
  const [savingChain, setSavingChain] = useState(false)
  const [errorText, setErrorText] = useState('')
  const [infoText, setInfoText] = useState('')

  const activeRestaurant = useMemo(
    () => restaurants.find((entry) => entry.id === selectedRestaurantId) ?? restaurant,
    [restaurant, restaurants, selectedRestaurantId],
  )

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const [chainData, restaurantList, restaurantData] = await Promise.all([
        session.chainId
          ? fetchRestaurantChainProfile({ session, chainId: session.chainId })
          : Promise.resolve(null),
        session.chainId
          ? fetchChainRestaurants({ session, chainId: session.chainId })
          : Promise.resolve([]),
        fetchRestaurantProfile({ session, restaurantId: selectedRestaurantId }),
      ])

      setChain(chainData)
      setChainNameDraft(chainData?.name ?? '')
      setRestaurants(restaurantList)
      setRestaurant(restaurantData)
      setRestaurantDraft(restaurantToDraft(restaurantData))
      setErrorText('')
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setLoading(false)
    }
  }, [selectedRestaurantId, session])

  useEffect(() => {
    queueMicrotask(() => {
      load()
    })
  }, [load])

  function updateRestaurantField(field, value) {
    setRestaurantDraft((current) => ({ ...current, [field]: value }))
  }

  function handleSelectRestaurant(nextRestaurantId) {
    setSelectedRestaurantId(nextRestaurantId)
    const nextRestaurant = restaurants.find((entry) => entry.id === nextRestaurantId)
    if (nextRestaurant) {
      setRestaurant(nextRestaurant)
      setRestaurantDraft(restaurantToDraft(nextRestaurant))
      onSessionChange?.({
        ...session,
        restaurantId: nextRestaurant.id,
        restaurant: nextRestaurant.name,
        chainId: nextRestaurant.chain_id ?? session.chainId,
      })
    }
  }

  async function handleSaveRestaurant() {
    const requiredFields = [
      'name',
      'opening_hours',
      'closing_hours',
      'delivery_radius',
      'street',
      'city',
      'postal_code',
      'country',
      'latitude',
      'longitude',
    ]
    const hasEmpty = requiredFields.some((field) => String(restaurantDraft[field] ?? '').trim() === '')
    if (hasEmpty) {
      setErrorText('Preenche todos os campos do restaurante.')
      return
    }

    if (
      Number.isNaN(Number(restaurantDraft.delivery_radius)) ||
      Number.isNaN(Number(restaurantDraft.latitude)) ||
      Number.isNaN(Number(restaurantDraft.longitude))
    ) {
      setErrorText('Raio de entrega e coordenadas precisam de valores numericos.')
      return
    }

    try {
      setSavingRestaurant(true)
      const updatedRestaurant = await updateRestaurantProfile({
        session,
        restaurantId: selectedRestaurantId,
        input: restaurantDraft,
      })
      setRestaurant(updatedRestaurant)
      setRestaurantDraft(restaurantToDraft(updatedRestaurant))
      setRestaurants((current) =>
        current.map((entry) => (entry.id === updatedRestaurant.id ? updatedRestaurant : entry)),
      )
      onSessionChange?.({
        ...session,
        restaurantId: updatedRestaurant.id,
        restaurant: updatedRestaurant.name,
        chainId: updatedRestaurant.chain_id ?? session.chainId,
      })
      setInfoText('Dados do restaurante atualizados.')
      setErrorText('')
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setSavingRestaurant(false)
    }
  }

  async function handleSaveChain() {
    if (!chainNameDraft.trim()) {
      setErrorText('Preenche o nome da cadeia.')
      return
    }

    try {
      setSavingChain(true)
      const updatedChain = await updateRestaurantChainProfile({
        session,
        chainId: session.chainId,
        name: chainNameDraft,
      })
      setChain(updatedChain)
      setChainNameDraft(updatedChain.name)
      setInfoText('Dados da cadeia atualizados.')
      setErrorText('')
    } catch (error) {
      setErrorText(error.message)
    } finally {
      setSavingChain(false)
    }
  }

  return (
    <section className="rb-page">
      <header className="rb-page-head">
        <h2>Perfil</h2>
        <p>Dados da cadeia, unidade ativa e informacao publica do restaurante.</p>
      </header>

      {errorText ? <p className="rb-chat-error">{errorText}</p> : null}
      {infoText ? <p className="rb-success-note">{infoText}</p> : null}

      <div className="rb-profile-grid">
        <article className="rb-table-card">
          <div className="rb-table-head">
            <h3>Cadeia</h3>
          </div>
          <div className="rb-profile-panel">
            <div className="rb-login-form">
              <label>
                Nome da cadeia
                <input
                  value={chainNameDraft}
                  onChange={(event) => setChainNameDraft(event.target.value)}
                  placeholder="Ex: FastBite"
                />
              </label>
              <div className="rb-form-actions">
                <button
                  type="button"
                  className="rb-btn-accept rb-btn-small"
                  onClick={handleSaveChain}
                  disabled={savingChain || !session.chainId}
                >
                  {savingChain ? 'A guardar...' : 'Guardar cadeia'}
                </button>
              </div>
            </div>

            <div className="rb-detail-row">
              <span>ID da cadeia</span>
              <code className="rb-mono" title={chain?.id ?? session.chainId ?? '-'}>
                {chain?.id ?? session.chainId ?? '-'}
              </code>
            </div>
            <div className="rb-detail-row">
              <span>Unidades</span>
              <strong>{restaurants.length}</strong>
            </div>
          </div>
        </article>

        <article className="rb-table-card">
          <div className="rb-table-head">
            <h3>Unidade ativa</h3>
          </div>
          <div className="rb-profile-panel">
            <label className="rb-profile-select">
              Restaurante
              <select
                value={selectedRestaurantId}
                onChange={(event) => handleSelectRestaurant(event.target.value)}
              >
                {restaurants.length === 0 ? (
                  <option value={selectedRestaurantId}>{session.restaurant}</option>
                ) : null}
                {restaurants.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="rb-detail-row">
              <span>ID da unidade</span>
              <code className="rb-mono" title={activeRestaurant?.id ?? selectedRestaurantId}>
                {activeRestaurant?.id ?? selectedRestaurantId}
              </code>
            </div>
            <div className="rb-detail-row">
              <span>Horario</span>
              <strong>
                {activeRestaurant?.opening_hours ?? '-'} - {activeRestaurant?.closing_hours ?? '-'}
              </strong>
            </div>
            <div className="rb-detail-row">
              <span>Avaliacao media</span>
              <strong>{ratingAverage(activeRestaurant)}</strong>
            </div>
          </div>
        </article>
      </div>

      <article className="rb-table-card">
        <div className="rb-table-head">
          <h3>Detalhes do restaurante</h3>
        </div>
        <div className="rb-profile-panel rb-login-form">
          <label>
            Nome
            <input
              value={restaurantDraft.name}
              onChange={(event) => updateRestaurantField('name', event.target.value)}
              placeholder="Ex: FastBite Lisboa Centro"
            />
          </label>
          <div className="rb-login-grid">
            <label>
              Abertura
              <input
                type="time"
                value={restaurantDraft.opening_hours}
                onChange={(event) => updateRestaurantField('opening_hours', event.target.value)}
              />
            </label>
            <label>
              Fecho
              <input
                type="time"
                value={restaurantDraft.closing_hours}
                onChange={(event) => updateRestaurantField('closing_hours', event.target.value)}
              />
            </label>
          </div>
          <label>
            Raio de entrega (km)
            <input
              type="number"
              min="0"
              step="0.1"
              value={restaurantDraft.delivery_radius}
              onChange={(event) => updateRestaurantField('delivery_radius', event.target.value)}
              placeholder="Ex: 7"
            />
          </label>
          <label>
            Rua
            <input
              value={restaurantDraft.street}
              onChange={(event) => updateRestaurantField('street', event.target.value)}
              placeholder="Ex: Rua Principal 1"
            />
          </label>
          <div className="rb-login-grid">
            <label>
              Cidade
              <input
                value={restaurantDraft.city}
                onChange={(event) => updateRestaurantField('city', event.target.value)}
                placeholder="Ex: Lisboa"
              />
            </label>
            <label>
              Codigo postal
              <input
                value={restaurantDraft.postal_code}
                onChange={(event) => updateRestaurantField('postal_code', event.target.value)}
                placeholder="Ex: 1000-001"
              />
            </label>
          </div>
          <div className="rb-login-grid">
            <label>
              Pais
              <input
                value={restaurantDraft.country}
                onChange={(event) => updateRestaurantField('country', event.target.value)}
                placeholder="Ex: PT"
              />
            </label>
            <label>
              Latitude
              <input
                type="number"
                step="0.000001"
                value={restaurantDraft.latitude}
                onChange={(event) => updateRestaurantField('latitude', event.target.value)}
                placeholder="Ex: 38.7223"
              />
            </label>
          </div>
          <label>
            Longitude
            <input
              type="number"
              step="0.000001"
              value={restaurantDraft.longitude}
              onChange={(event) => updateRestaurantField('longitude', event.target.value)}
              placeholder="Ex: -9.1393"
            />
          </label>

          <div className="rb-form-actions">
            <button
              type="button"
              className="rb-btn-accept rb-btn-small"
              onClick={handleSaveRestaurant}
              disabled={savingRestaurant || !selectedRestaurantId}
            >
              {savingRestaurant ? 'A guardar...' : 'Guardar restaurante'}
            </button>
          </div>
        </div>
      </article>
    </section>
  )
}
