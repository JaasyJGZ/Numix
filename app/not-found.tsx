import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <div className="text-center p-8 bg-card rounded-lg shadow-md max-w-md w-full">
        <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
        <h2 className="text-2xl font-semibold mb-4">Página no encontrada</h2>
        <p className="text-muted-foreground mb-6">
          Lo sentimos, la página que estás buscando no existe o ha sido movida.
        </p>
        <Link 
          href="/"
          className="px-6 py-3 bg-gradient-to-r from-[#FF6B6B] to-[#4ECDC4] text-white font-medium rounded-lg hover:opacity-90 transition-all duration-300"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  )
}