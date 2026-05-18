export function RatingStars({ rating, max = 5, size = 16 }) {
  const filled = Math.max(0, Math.min(max, Math.round(Number(rating ?? 0))))
  return (
    <span style={{ color: '#f59e0b', fontSize: size, letterSpacing: 2 }}>
      {'★'.repeat(filled)}
      <span style={{ color: '#cbd5e1' }}>{'☆'.repeat(max - filled)}</span>
    </span>
  )
}
