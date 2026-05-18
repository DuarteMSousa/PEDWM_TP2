export function Skeleton({ width = '100%', height = 16, radius = 8, style = {} }) {
  return (
    <span
      className="rb-skeleton-shimmer"
      style={{
        display: 'block',
        width,
        height,
        borderRadius: radius,
        ...style,
      }}
    />
  )
}

export function SkeletonList({ rows = 3, height = 14, gap = 8 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {Array.from({ length: rows }).map((_, idx) => (
        <Skeleton key={idx} height={height} />
      ))}
    </div>
  )
}
