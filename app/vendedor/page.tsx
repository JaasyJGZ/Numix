"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight, LogOut, Calendar, DollarSign, Users, Award } from "lucide-react"
import Link from "next/link"

interface Stats {
  totalSales: number
  activeDraws: number
  totalCustomers: number
  lastDrawWinners: number
}

export default function VendorDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats>({
    totalSales: 0,
    activeDraws: 0,
    totalCustomers: 0,
    lastDrawWinners: 0,
  })

  useEffect(() => {
    // Fetch stats from localStorage
    const fetchStats = () => {
      const events = JSON.parse(localStorage.getItem("events") || "[]")
      const activeDraws = events.filter((event: any) => event.active).length
      const currentVendorEmail = localStorage.getItem("currentVendorEmail")

      // Calculate total sales and customers from tickets
      let totalSales = 0
      const customers = new Set()
      events.forEach((event: any) => {
        // CORREGIR: Usar la clave correcta con email del vendedor
        const tickets = JSON.parse(localStorage.getItem(`tickets_${event.id}_${currentVendorEmail}`) || "[]")
        tickets.forEach((ticket: any) => {
          totalSales += ticket.amount
          customers.add(ticket.clientName)
        })
      })

      setStats({
        totalSales,
        activeDraws,
        totalCustomers: customers.size,
        lastDrawWinners: 0, // This would be updated when implementing winner tracking
      })
    }

    fetchStats()
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              NUMIX
            </h1>
            <Button onClick={() => router.push("/")} variant="ghost" className="hover:bg-muted">
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-card border-border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ventas Totales</p>
                <h3 className="text-2xl font-bold text-primary">${stats.totalSales.toFixed(2)}</h3>
              </div>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
            </div>
          </Card>

          <Card className="bg-card border-border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Sorteos Activos</p>
                <h3 className="text-2xl font-bold text-primary">{stats.activeDraws}</h3>
              </div>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
            </div>
          </Card>

          <Card className="bg-card border-border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Clientes</p>
                <h3 className="text-2xl font-bold text-primary">{stats.totalCustomers}</h3>
              </div>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
          </Card>

          <Card className="bg-card border-border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ganadores Recientes</p>
                <h3 className="text-2xl font-bold text-primary">{stats.lastDrawWinners}</h3>
              </div>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Award className="h-6 w-6 text-primary" />
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Acciones Rápidas</h2>

          <Link href="/sorteos" className="block">
            <Card className="bg-card border-border p-6 hover:bg-muted transition-colors cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-lg font-medium text-foreground">Gestionar Sorteos</h3>
                  <p className="text-sm text-muted-foreground">Ver y gestionar todos los sorteos activos</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </Card>
          </Link>

          <Link href="/vendedor/reportes" className="block">
            <Card className="bg-card border-border p-6 hover:bg-muted transition-colors cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-lg font-medium text-foreground">Reporte General</h3>
                  <p className="text-sm text-muted-foreground">Ver el reporte general de ventas y tickets</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </Card>
          </Link>
        </div>
      </main>
    </div>
  )
}

