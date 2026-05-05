export function PrimaryButton({ children, onClick, type = 'button' }) {
  return (
    <button type={type} className="primary-button" onClick={onClick}>
      {children}
    </button>
  )
}
