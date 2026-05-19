import { formatEventType } from '../../utils/orderEventLabel'

function formatTime(value) {
  if (!value) return '-'
  try {
    return new Date(value).toLocaleString()
  } catch {
    return '-'
  }
}

export function OrderTimeline({ events = [], limit = null }) {
  if (!events || events.length === 0) {
    return <p className="rb-event-empty">Sem eventos registados.</p>
  }
  const reversed = [...events].reverse()
  const visible = limit ? reversed.slice(0, limit) : reversed
  return (
    <div className="rb-event-timeline">
      {visible.map((event, index) => (
        <div className="rb-event-item" key={`${event.event_type}-${event.timestamp}-${index}`}>
          <span>{formatEventType(event.event_type)}</span>
          <small>{formatTime(event.timestamp)}</small>
        </div>
      ))}
    </div>
  )
}
