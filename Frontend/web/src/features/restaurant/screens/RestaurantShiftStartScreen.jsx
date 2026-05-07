export function RestaurantShiftStartScreen() {
  const checklist = [
    { item: 'Conferir stock critico (proteinas, bebidas, embalagens)', owner: 'Chefe cozinha' },
    { item: 'Testar notificacoes sonoras de pedidos novos', owner: 'Front desk' },
    { item: 'Validar terminal de pagamento e impressora', owner: 'Caixa' },
    { item: 'Confirmar estafetas online para hora de almoco', owner: 'Operacoes' },
  ]

  return (
    <section className="workspace">
      <header className="workspace-header">
        <h2>Abertura de turno</h2>
        <p>
          Ritual de abertura para garantir que a loja entra em operacao com SLA e notificacoes
          estaveis.
        </p>
      </header>

      <div className="uc-row">
        {['UC08', 'UC09', 'UC15'].map((uc) => (
          <span key={uc} className="uc-pill">
            {uc}
          </span>
        ))}
      </div>

      <div className="dashboard-grid">
        <div className="stats-grid">
          <article className="stat-card">
            <p className="stat-label">Turno</p>
            <p className="stat-value">Manha</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">Abertura prevista</p>
            <p className="stat-value">11:00</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">Checklist concluida</p>
            <p className="stat-value">3/4</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">Estado da loja</p>
            <p className="stat-value">Pausada</p>
          </article>
        </div>

        <div className="workspace-columns">
          <article className="panel">
            <h3>Checklist operacional</h3>
            <p className="panel-sub">Executar antes de abrir pedidos ao publico</p>
            {checklist.map((check) => (
              <div className="notice-row" key={check.item}>
                <span>
                  {check.item}
                  <br />
                  <small>{check.owner}</small>
                </span>
                <span className="badge ok">OK</span>
              </div>
            ))}
            <div className="mini-actions">
              <button type="button" className="mini-button">
                Guardar checklist
              </button>
              <button type="button" className="mini-button">
                Marcar loja como Aberta
              </button>
            </div>
          </article>

          <article className="panel">
            <h3>Resumo de capacidade</h3>
            <p className="panel-sub">Input rapido para adaptar previsao de pico</p>
            <div className="timeline">
              <div className="timeline-item">
                <strong>Cozinha ativa</strong>
                <span>4 pessoas em linha · 1 apoio quente</span>
              </div>
              <div className="timeline-item">
                <strong>Tempo medio por pedido</strong>
                <span>12 min (meta: &lt; 14 min)</span>
              </div>
              <div className="timeline-item">
                <strong>Pool de estafetas</strong>
                <span>7 online no raio de 2 km</span>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}
