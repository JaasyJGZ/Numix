import { Card } from "@/components/ui/card"
import type { ReactNode } from "react"
import Link from "next/link"

interface ActionCardProps {
  title: string
  description: string
  icon: ReactNode
  href: string
}

export function ActionCard({ title, description, icon, href }: ActionCardProps) {
  return (
    <Link href={href} className="block">
      <Card className="bg-white/5 border-0 p-4 md:p-6 hover:bg-white/10 transition-colors cursor-pointer">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-base md:text-lg font-medium text-white">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          {icon}
        </div>
      </Card>
    </Link>
  )
}

