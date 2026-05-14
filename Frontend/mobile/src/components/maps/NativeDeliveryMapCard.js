import { DeliveryMapCard } from './DeliveryMapCard'

export function NativeDeliveryMapCard({ title, subtitle, pickup, dropoff, courier, routePoints, positions }) {
  return (
    <DeliveryMapCard
      title={title}
      subtitle={subtitle}
      pickup={pickup}
      dropoff={dropoff}
      courier={courier}
      routePoints={routePoints}
      positions={positions}
    />
  )
}
