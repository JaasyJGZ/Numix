export function useSmartPolling(callback: () => void, interval: number) {
  useEffect(() => {
    let intervalId: NodeJS.Timeout
    
    const startPolling = () => {
      intervalId = setInterval(callback, interval)
    }
    
    const stopPolling = () => {
      if (intervalId) clearInterval(intervalId)
    }
    
    // Pausar cuando la pestaña no está activa
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling()
      } else {
        startPolling()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    startPolling()
    
    return () => {
      stopPolling()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [callback, interval])
}