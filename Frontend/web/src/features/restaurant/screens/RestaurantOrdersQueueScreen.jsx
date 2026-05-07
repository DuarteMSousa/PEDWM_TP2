export function RestaurantOrdersQueueScreen() {
  const stats = [
    { icon: 'PK', label: 'Encomendas hoje', value: '24', delta: '+12%', tone: 'up' },
    { icon: '$', label: 'Receita do dia', value: '342.50 EUR', delta: '+8%', tone: 'up' },
    { icon: 'TM', label: 'Tempo medio', value: '28 min', delta: '-5%', tone: 'down' },
    { icon: 'RT', label: 'Avaliacao', value: '4.8', delta: '+0.2', tone: 'up' },
  ]

  const rows = [
    { id: '#4521', customer: 'Joao Silva', items: '3 itens', total: '24.50 EUR', status: 'Concluido', time: '10 min', tone: 'done' },
    { id: '#4522', customer: 'Maria Santos', items: '2 itens', total: '18.00 EUR', status: 'Concluido', time: '15 min', tone: 'done' },
    { id: '#4523', customer: 'Pedro Costa', items: '5 itens', total: '42.00 EUR', status: 'A preparar', time: '5 min', tone: 'prep' },
    { id: '#4524', customer: 'Ana Oliveira', items: '1 item', total: '12.50 EUR', status: 'A preparar', time: '8 min', tone: 'prep' },
    { id: '#4525', customer: 'Carlos Mendes', items: '4 itens', total: '35.00 EUR', status: 'Pendente', time: 'Agora', tone: 'pending' },
  ]

  return (
    <section className="rb-page">
      <header className="rb-page-head">
        <h2>Dashboard</h2>
        <p>Visao geral do restaurante</p>
      </header>

      <div className="rb-stat-grid">
        {stats.map((stat) => (
          <article key={stat.label} className="rb-stat-card">
            <div className="rb-stat-row">
              <span className="rb-stat-icon">{stat.icon}</span>
              <span className={`rb-stat-delta ${stat.tone === 'down' ? 'down' : 'up'}`}>{stat.delta}</span>
            </div>
            <p className="rb-stat-label">{stat.label}</p>
            <p className="rb-stat-value">{stat.value}</p>
          </article>
        ))}
      </div>

      <article className="rb-table-card">
        <div className="rb-table-head">
          <h3>Encomendas recentes</h3>
        </div>
        <table className="rb-table">
          <thead>
            <tr>
              <th>Pedido</th>
              <th>Cliente</th>
              <th>Itens</th>
              <th>Total</th>
              <th>Estado</th>
              <th>Tempo</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.id}</td>
                <td>{row.customer}</td>
                <td>{row.items}</td>
                <td>{row.total}</td>
                <td>
                  <span className={`rb-chip ${row.tone}`}>{row.status}</span>
                </td>
                <td>{row.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </section>
  )
}
