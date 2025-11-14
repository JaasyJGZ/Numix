export interface Vendor {
  id: string
  name: string
  email: string
  password: string
  active: boolean
}

export interface Event {
  id: string
  name: string
  startDate: string
  endDate: string
  startTime: string
  endTime: string
  startDateTime?: string
  endDateTime: string
  totalSold: number
  sellerTimes: number
  tickets: Ticket[]
  status: "active" | "closed_awarded" | "closed_not_awarded" | "closed_pending" | "closed"
  active?: boolean
  repeatDaily?: boolean
  pricePerTime?: number
  prize?: number
  profit?: number
  // Campos para límites de números
  minNumber?: number
  maxNumber?: number
  excludedNumbers?: string
  // Campos para eventos premiados
  awardedNumbers?: {
    firstPrize: string
    secondPrize: string
    thirdPrize: string
    awardedAt: string
  }
}

export interface Ticket {
  id: string
  clientName: string
  amount: number
  numbers?: string
  rows: TicketRow[]
  vendorEmail?: string // Añadir campo para el email del vendedor
}

export interface TicketRow {
  id: string
  times: string
  actions: string
  value: number
}

export interface Draw {
  id: string
  name: string
  datetime: string
  status: "active" | "closed" | "closed_awarded" | "closed_pending"
  awardedNumbers?: {
    firstPrize: string
    secondPrize: string
    thirdPrize: string
  }
}

export interface ClosedDraw {
  id: string
  name: string
  date: string
  endTime: string
  firstPrize: string
  secondPrize: string
  thirdPrize: string
  awardDate: string
}

export interface TicketData {
  number: string
  timesSold: number
}

