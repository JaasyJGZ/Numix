// Extender el objeto Window para incluir nuestra propiedad personalizada
interface Window {
  /**
   * Flag para prevenir la duplicación de tickets durante el proceso de creación/actualización
   */
  _isProcessingTicket?: boolean;
}

// NUEVO: Agregar tipos para APIs del navegador
interface NetworkInformation {
  saveData?: boolean
  effectiveType?: 'slow-2g' | '2g' | '3g' | '4g'
}

interface Navigator {
  connection?: NetworkInformation
}