export function PageContainer({ children, restaurantName = 'FastBite Restaurant', restaurantUnit }) {
  return (
    <main className="rb-app">
      <header className="rb-topbar">
        <div className="rb-brand">
          <div className="rb-brand-mark">FB</div>
          <div>
            <p className="rb-brand-title">{restaurantName}</p>
            <p className="rb-brand-sub">{restaurantUnit ?? 'Pizzaria do Centro'}</p>
          </div>
        </div>
        <div className="rb-top-actions">
          <button type="button" className="rb-icon-btn">
            Alerts
          </button>
          <button type="button" className="rb-icon-btn">
            Settings
          </button>
        </div>
      </header>
      <section className="rb-body">{children}</section>
    </main>
  )
}
