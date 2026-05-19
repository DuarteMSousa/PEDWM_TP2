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
        <linearGradient id="fb-plate" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>
        <linearGradient id="fb-bolt" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="100%" stopColor="#eab308" />
        </linearGradient>
      </defs>

      {/* Prato (circulo principal) */}
      <circle cx="32" cy="32" r="28" fill="url(#fb-plate)" />

      {/* Borda interna do prato */}
      <circle
        cx="32"
        cy="32"
        r="22"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.4"
        opacity="0.35"
      />

      {/* Raio amarelo: zigzag classico atravessando o prato */}
      <path
        d="M 36 14 L 24 34 L 30 34 L 26 50 L 40 30 L 34 30 Z"
        fill="url(#fb-bolt)"
        stroke="#b45309"
        strokeWidth="0.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Brilho subtil no raio para profundidade */}
      <path
        d="M 35 16 L 27 30 L 30 30"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.5"
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
