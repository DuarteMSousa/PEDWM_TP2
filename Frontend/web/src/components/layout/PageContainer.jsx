export function PageContainer({ title, subtitle, children }) {
  return (
    <main className="page-container">
      <header className="page-header">
        <p className="eyebrow">PEDWM TP2</p>
        <h1>{title}</h1>
        {subtitle ? <p className="subtitle">{subtitle}</p> : null}
      </header>
      <section className="content-card">{children}</section>
    </main>
  )
}
