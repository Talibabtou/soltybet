export interface Fighter {
  id: string
  name: string
  fight_count: number
  wins: number
  losses: number
  elo: number
}

export interface Match {
  id: string
  red_fighter_id: string
  blue_fighter_id: string
  redFighter: Fighter
  blueFighter: Fighter
  phase: GamePhase
  volume_red: number
  volume_blue: number
  bet_count: number
}

export type GamePhase =
  | 'waiting'
  | 'betting'
  | 'locked'
  | 'fighting'
  | 'finished'

export interface PhaseMessage {
  type: 'phase' | 'info'
  text: string
  redFighter?: string
  blueFighter?: string
  match_id?: string
  total_red?: number
  total_blue?: number
}

export interface VolumeData {
  total_red: number
  total_blue: number
  bet_count: number
}
