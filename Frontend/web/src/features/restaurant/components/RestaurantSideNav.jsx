export function RestaurantSideNav({ views, activeViewId, onSelect, operatorName, onLogout }) {
  return (
    <aside className="rb-sidebar">
      {views.map((view) => (
        <button
          key={view.id}
          type="button"
          className={`rb-sidebar-item ${view.id === activeViewId ? 'active' : ''}`}
          onClick={() => onSelect(view.id)}
        >
          <span className="rb-sidebar-icon">{view.icon}</span>
          <span>{view.label}</span>
          {view.badge ? <span className="rb-sidebar-badge">{view.badge}</span> : null}
        </button>
      ))}
      <div className="rb-sidebar-status">
        <p>
          <strong>Restaurante Aberto</strong>
          <br />
          A aceitar encomendas
        </p>
      </div>
      <div className="rb-sidebar-footer">
        <p>
          Sessao: <strong>{operatorName}</strong>
        </p>
        <button type="button" className="rb-link-btn" onClick={onLogout}>
          Terminar sessao
        </button>
      </div>
    </aside>
  )
}
