import { FastBiteLogo } from '../common/FastBiteLogo'

export function PageContainer({
  children,
  restaurantName = 'FastBite Restaurant',
  restaurantUnit,
  topbarActions = null,
}) {
  return (
    <main className="rb-app">
      <header className="rb-topbar">
        <div className="rb-brand">
          <div className="rb-brand-mark">
            <FastBiteLogo size={32} withFrame={false} />
          </div>
          <div>
            <p className="rb-brand-title">{restaurantName}</p>
            <p className="rb-brand-sub">{restaurantUnit ?? 'Pizzaria do Centro'}</p>
          </div>
        </div>
        {topbarActions ? <div className="rb-top-actions">{topbarActions}</div> : null}
      </header>
      <section className="rb-body">{children}</section>
    </main>
  )
}
