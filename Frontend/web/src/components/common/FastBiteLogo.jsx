export function FastBiteLogo({ size = 40, withFrame = true }) {
  const inner = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      aria-hidden="true"
      role="img"
    >
      <defs>
        <linearGradient id="fb-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff8a3d" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>
      </defs>

      {/* Fundo arredondado laranja */}
      <rect width="64" height="64" rx="14" fill="url(#fb-bg)" />

      {/* Corpo do saco de delivery */}
      <path
        d="M 16 22 L 48 22 L 46 52 Q 46 54 44 54 L 20 54 Q 18 54 18 52 Z"
        fill="#ffffff"
      />

      {/* Alca do saco */}
      <path
        d="M 24 22 Q 24 14 32 14 Q 40 14 40 22"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.4"
        strokeLinecap="round"
      />

      {/* Raio (FastBite mark) */}
      <path
        d="M 34 28 L 26 40 L 31 40 L 28 48 L 38 36 L 33 36 Z"
        fill="#ea580c"
      />
    </svg>
  )

  if (!withFrame) return inner

  return (
    <div
      style={{
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {inner}
    </div>
  )
}
