import { useState } from 'react'

export function RestaurantVirtualKitchenScreen() {
  const pendingOrders = [
    {
      id: '#4524',
      total: '16.50',
      time: '14:42 - ~30 min',
      customer: 'Ana Oliveira',
      phone: '+351 913 456 789',
      address: 'Avenida da Liberdade, 45, Lisboa',
      items: ['1x Lasanha Bolonhesa', '1x Tiramisu'],
    },
    {
      id: '#4525',
      total: '35.00',
      time: '14:48 - ~35 min',
      customer: 'Carlos Mendes',
      phone: '+351 914 567 890',
      address: 'Praca do Comercio, 10, Coimbra',
      items: ['2x Spaghetti Carbonara', '1x Pizza Vegetariana', '2x Panna Cotta'],
    },
  ]
  const [prepItems, setPrepItems] = useState([
    { id: 'item-1', name: '2x Pizza Margherita', status: 'preparing' },
    { id: 'item-2', name: '1x Pizza Pepperoni', status: 'preparing' },
    { id: 'item-3', name: '2x Coca-Cola', status: 'ready' },
  ])
  const [prepNote, setPrepNote] = useState('')

  const prepOrderStatus = prepItems.every((item) => item.status === 'ready')
    ? 'ready'
    : prepItems.some((item) => item.status === 'preparing')
      ? 'preparing'
      : 'pending'

  function updateItemStatus(itemId, nextStatus) {
    setPrepItems((current) =>
      current.map((item) => (item.id === itemId ? { ...item, status: nextStatus } : item)),
    )
    setPrepNote('')
  }

  function markOrderReady() {
    setPrepItems((current) => current.map((item) => ({ ...item, status: 'ready' })))
    setPrepNote('Pedido #4523 marcado como pronto e evento ORDER_READY registado.')
  }

  function sendMessage() {
    setPrepNote('Mensagem enviada ao cliente: "Pedido quase pronto para recolha."')
  }

  return (
    <section className="rb-page">
      <header className="rb-page-head rb-page-head-row">
        <div>
          <h2>Cozinha Virtual</h2>
          <p>Gerir encomendas e preparacao de pratos</p>
        </div>
        <div className="rb-toast">
          <strong>Nova encomenda recebida!</strong>
          <span>Um cliente acabou de fazer um pedido.</span>
        </div>
      </header>

      <h3 className="rb-section-title">
        Encomendas pendentes <span>2</span>
      </h3>

      <div className="rb-kitchen-grid">
        {pendingOrders.map((order) => (
          <article className="rb-kitchen-card" key={order.id}>
            <header className="rb-kitchen-header">
              <div>
                <h4>{order.id}</h4>
                <p>{order.time}</p>
              </div>
              <div className="rb-kitchen-price">
                <strong>{order.total} EUR</strong>
                <span className="rb-chip pending">Pendente</span>
              </div>
            </header>

            <div className="rb-kitchen-contact">
              <p>{order.customer}</p>
              <p>{order.phone}</p>
              <p>{order.address}</p>
            </div>

            <div className="rb-kitchen-items">
              {order.items.map((item) => (
                <div key={item}>{item}</div>
              ))}
            </div>

            <div className="rb-kitchen-actions">
              <button type="button" className="rb-btn-outline">
                Rejeitar
              </button>
              <button type="button" className="rb-btn-accept">
                Aceitar
              </button>
            </div>
          </article>
        ))}
      </div>

      <h3 className="rb-section-title">
        Em preparacao <span className="blue">1</span>
      </h3>
      <article className="rb-prep-detail">
        <header className="rb-prep-header">
          <div>
            <h4>#4523</h4>
            <p>14:35 - ~25 min</p>
          </div>
          <div className="rb-kitchen-price">
            <strong>42.00 EUR</strong>
            <span
              className={`rb-chip ${
                prepOrderStatus === 'ready'
                  ? 'done'
                  : prepOrderStatus === 'preparing'
                    ? 'prep'
                    : 'pending'
              }`}
            >
              {prepOrderStatus === 'ready'
                ? 'Pronto'
                : prepOrderStatus === 'preparing'
                  ? 'A preparar'
                  : 'Pendente'}
            </span>
          </div>
        </header>

        <div className="rb-kitchen-contact">
          <p>Pedro Costa</p>
          <p>+351 912 345 678</p>
          <p>Rua das Flores, 123, Porto</p>
        </div>

        <div className="rb-prep-lines">
          {prepItems.map((item) => (
            <div className="rb-prep-line" key={item.id}>
              <strong>{item.name}</strong>
              <div className="rb-step-pills">
                <button
                  type="button"
                  className={`rb-step ${item.status === 'pending' ? 'active' : ''}`}
                  onClick={() => updateItemStatus(item.id, 'pending')}
                >
                  Pendente
                </button>
                <button
                  type="button"
                  className={`rb-step ${item.status === 'preparing' ? 'active' : ''}`}
                  onClick={() => updateItemStatus(item.id, 'preparing')}
                >
                  A preparar
                </button>
                <button
                  type="button"
                  className={`rb-step ${item.status === 'ready' ? 'done' : ''}`}
                  onClick={() => updateItemStatus(item.id, 'ready')}
                >
                  Pronto
                </button>
              </div>
            </div>
          ))}
        </div>

        <footer className="rb-prep-actions">
          <button type="button" className="rb-btn-outline" onClick={sendMessage}>
            Mensagem
          </button>
          <button type="button" className="rb-btn-accept" onClick={markOrderReady}>
            Marcar pronto
          </button>
        </footer>
        {prepNote ? <p className="rb-prep-note">{prepNote}</p> : null}
      </article>
    </section>
  )
}
