export function RestaurantOrderDetailScreen() {
  const items = [
    { name: 'Smash Burger', qty: 2, note: 'Sem cebola, extra cheddar', price: '23.80 EUR' },
    { name: 'Batata Trufada', qty: 1, note: 'Molho a parte', price: '4.50 EUR' },
    { name: 'Kombucha Ginger', qty: 1, note: '330ml', price: '3.20 EUR' },
  ]

  const rejectionReasons = [
    'Rutura de stock',
    'Capacidade da cozinha excedida',
    'Falha no pagamento',
    'Endereco fora do raio',
  ]

  return (
    <section className="workspace">
      <header className="workspace-header">
        <h2>Detalhe do pedido FB-1042</h2>
        <p>Validacao completa antes de aceitar ou rejeitar a encomenda.</p>
      </header>

      <div className="uc-row">
        {['UC08', 'UC14'].map((uc) => (
          <span key={uc} className="uc-pill">
            {uc}
          </span>
        ))}
      </div>

      <div className="workspace-columns">
        <article className="panel">
          <h3>Resumo da encomenda</h3>
          <p className="panel-sub">Cliente: Joana Cardoso · Criado as 12:14</p>
          {items.map((item) => (
            <div className="order-card" key={item.name}>
              <div className="order-top">
                <span className="order-id">
                  {item.qty}x {item.name}
                </span>
                <span className="badge ok">{item.price}</span>
              </div>
              <div className="row-meta">
                <span>{item.note}</span>
              </div>
            </div>
          ))}
          <div className="notice-row">
            <span>
              Metodo pagamento
              <br />
              <small>MBWay confirmado</small>
            </span>
            <span className="badge ok">COMPLETED</span>
          </div>
          <div className="notice-row">
            <span>
              Morada entrega
              <br />
              <small>Rua 5 de Outubro 201, Porto</small>
            </span>
            <span className="badge warn">3.1 km</span>
          </div>
        </article>

        <article className="panel">
          <h3>Decisao do restaurante</h3>
          <p className="panel-sub">Ao rejeitar, motivo e obrigatorio para auditoria e notificacao.</p>
          <div className="timeline">
            {rejectionReasons.map((reason) => (
              <div className="timeline-item" key={reason}>
                <strong>{reason}</strong>
                <span>Disponivel como motivo de rejeicao</span>
              </div>
            ))}
          </div>
          <div className="mini-actions">
            <button type="button" className="mini-button">
              Aceitar pedido
            </button>
            <button type="button" className="mini-button">
              Rejeitar com motivo
            </button>
          </div>
        </article>
      </div>
    </section>
  )
}
