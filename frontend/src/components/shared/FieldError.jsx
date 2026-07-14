export function FieldError({ error }) {
  if (!error) return null
  return (
    <p style={{
      color: 'var(--danger)',
      fontSize: 'var(--text-sm)',
      marginTop: 4,
      display: 'flex',
      alignItems: 'center',
      gap: 4
    }}>
      ⚠ {error}
    </p>
  )
}
