export function RestaurantOperationsScreen() {
  const notices = [
    { channel: 'Push cliente', state: 'Ativo', cls: 'ok' },
    { channel: 'Email restaurante', state: 'Ativo', cls: 'ok' },
    { channel: 'SMS fallback', state: 'Degradado', cls: 'warn' },
  ]

  return (
    <section className="workspace">
      <header className="workspace-header">
        <h2>Operacao, estafetas e notificacoes</h2>
        <p>
          Vista de confiabilidade para outbox, disponibilidade de estafetas e canais de alerta.
        </p>
      </header>

      <div className="uc-row">
        {['UC09', 'UC15'].map((uc) => (
          <span key={uc} className="uc-pill">
            {uc}
          </span>
        ))}
      </div>

      <div className="dashboard-grid">
        <div className="stats-grid">
          <article className="stat-card">
            <p className="stat-label">Estafetas online</p>
            <p className="stat-value">12</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">Tempo medio atribuição</p>
            <p className="stat-value">00m 28s</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">Eventos outbox retry</p>
            <p className="stat-value">04</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">Taxa entrega no prazo</p>
            <p className="stat-value">94.6%</p>
          </article>
        </div>

        <div className="ops-grid">
          <article className="panel">
            <h3>Saude dos canais de notificacao</h3>
            <p className="panel-sub">Orquestracao assincrona para não bloquear checkout</p>
            {notices.map((notice) => (
              <div key={notice.channel} className="notice-row">
                <span>{notice.channel}</span>
                <span className={`badge ${notice.cls}`}>{notice.state}</span>
              </div>
            ))}
          </article>

          <article className="panel">
            <h3>Pool de estafetas por zona</h3>
            <p className="panel-sub">Prioridade por proximidade + disponibilidade</p>
            <div className="timeline">
              <div className="timeline-item">
                <strong>Zona Centro</strong>
                <span>5 online · SLA 23s</span>
              </div>
              <div className="timeline-item">
                <strong>Zona Este</strong>
                <span>3 online · SLA 31s</span>
              </div>
              <div className="timeline-item">
                <strong>Zona Norte</strong>
                <span>4 online · SLA 34s</span>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}
