export function RestaurantViewPanel({ view }) {
  return (
    <section className="workspace">
      <header className="workspace-header">
        <h2>{view.title}</h2>
        <p>{view.subtitle}</p>
      </header>

      <div className="uc-row">
        {view.useCases.map((uc) => (
          <span key={uc} className="uc-pill">
            {uc}
          </span>
        ))}
      </div>

      <div className="placeholder-card">
        <p className="placeholder-label">Placeholder funcional</p>
        <ul className="checklist">
          {view.checklist.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </section>
  )
}
