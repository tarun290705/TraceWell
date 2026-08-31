export default function ApplicationStatus({ isConnected }) {
  return (
    <span className={`status-badge ${isConnected ? 'status-connected' : 'status-disconnected'}`}>
      <span className={`status-dot${isConnected ? ' pulse' : ''}`} aria-hidden="true" />
      {isConnected ? 'Connected' : 'Disconnected'}
    </span>
  )
}