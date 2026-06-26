import { useEffect } from 'react'

export default function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  const getToastClass = () => {
    if (type === 'success') return 'toast-success'
    if (type === 'warning') return 'toast-warning'
    if (type === 'danger' || type === 'error') return 'toast-danger'
    return 'toast-success'
  }

  const getIcon = () => {
    if (type === 'success') return '✅'
    if (type === 'warning') return '⚠️'
    return '❌'
  }

  return (
    <div className={`toast ${getToastClass()}`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>{getIcon()}</span>
        <span>{message}</span>
      </div>
      <button className="toast-close" onClick={onClose}>&times;</button>
    </div>
  )
}
