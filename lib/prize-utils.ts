import type React from "react"
import { PRIZE_MULTIPLIERS } from "./constants"

export interface AwardedNumbers {
  firstPrize: string
  secondPrize: string
  thirdPrize: string
  awardedAt?: string
}

export interface TicketRow {
  times: string
  actions: string
}

export interface Ticket {
  rows: TicketRow[]
}

// Función para calcular el premio total
export function calculateTotalPrize(tickets: Ticket[], awardedNumbers?: AwardedNumbers): number {
  // Si no hay números premiados, retornar 0
  if (!awardedNumbers) {
    return 0
  }

  // Obtener los números premiados
  const { firstPrize, secondPrize, thirdPrize } = awardedNumbers

  // Calcular cuántos tiempos se vendieron para cada número premiado
  let firstPrizeTimes = 0
  let secondPrizeTimes = 0
  let thirdPrizeTimes = 0

  tickets.forEach((ticket) => {
    ticket.rows.forEach((row) => {
      if (row.actions === firstPrize) {
        firstPrizeTimes += Number(row.times) || 0
      } else if (row.actions === secondPrize) {
        secondPrizeTimes += Number(row.times) || 0
      } else if (row.actions === thirdPrize) {
        thirdPrizeTimes += Number(row.times) || 0
      }
    })
  })

  // Calcular los premios según los multiplicadores
  const primerPremio = firstPrizeTimes * PRIZE_MULTIPLIERS.FIRST
  const segundoPremio = secondPrizeTimes * PRIZE_MULTIPLIERS.SECOND
  const tercerPremio = thirdPrizeTimes * PRIZE_MULTIPLIERS.THIRD

  // Retornar la suma total de los premios
  return primerPremio + segundoPremio + tercerPremio
}

// Función para obtener el estilo de color para los números premiados
export function getNumberStyle(number: string, awardedNumbers?: AwardedNumbers): React.CSSProperties {
  if (!awardedNumbers) return {}

  const { firstPrize, secondPrize, thirdPrize } = awardedNumbers

  if (number === firstPrize) {
    return { color: "#FFD700" } // Amarillo para primer premio
  } else if (number === secondPrize) {
    return { color: "#9333EA" } // Color morado para segundo premio
  } else if (number === thirdPrize) {
    return { color: "#FF6B6B" } // Color primary para tercer premio
  }

  return {}
}

