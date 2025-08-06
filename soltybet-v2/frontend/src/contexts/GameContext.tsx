"use client";

import { createContext, useContext, useReducer, ReactNode } from "react";

interface User {
  id: string;
  wallet_address: string;
  total_volume: number;
  bet_count: number;
  created_at: string;
}

interface Fighter {
  id: string;
  name: string;
  fight_count: number;
  wins: number;
  losses: number;
  elo: number;
}

interface Match {
  id: string;
  red_fighter_id: string;
  blue_fighter_id: string;
  winner_id?: string;
  redFighter: Fighter;
  blueFighter: Fighter;
  winner?: Fighter;
  phase: GamePhase;
  volume_red: number;
  volume_blue: number;
  bet_count: number;
  created_at: string;
}

interface Bet {
  id: string;
  user_id: string;
  match_id: string;
  fighter_id: string;
  team: "red" | "blue";
  volume: number;
  payout: number;
  tx_signature?: string;
  confirmed: boolean;
  created_at: string;
}

type GamePhase = "waiting" | "betting" | "locked" | "fighting" | "finished";

interface GameState {
  currentMatch: Match | null;
  phase: GamePhase;
  timeRemaining: number;
  isGateOpen: boolean;
}

// Actions
type GameAction =
  | { type: "SET_MATCH"; payload: Match }
  | { type: "SET_PHASE"; payload: GamePhase }
  | { type: "SET_TIME"; payload: number }
  | { type: "SET_GATE"; payload: boolean }
  | {
      type: "UPDATE_VOLUME";
      payload: { team: "red" | "blue"; amount: number };
    };

// Reducer
const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case "SET_MATCH":
      return { ...state, currentMatch: action.payload };
    case "SET_PHASE":
      return { ...state, phase: action.payload };
    case "SET_TIME":
      return { ...state, timeRemaining: action.payload };
    case "SET_GATE":
      return { ...state, isGateOpen: action.payload };
    case "UPDATE_VOLUME":
      if (!state.currentMatch) return state;
      return {
        ...state,
        currentMatch: {
          ...state.currentMatch,
          [action.payload.team === "red" ? "volume_red" : "volume_blue"]:
            state.currentMatch[
              action.payload.team === "red" ? "volume_red" : "volume_blue"
            ] + action.payload.amount,
        },
      };
    default:
      return state;
  }
};

// Context
const GameContext = createContext<{
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
} | null>(null);

// Provider
export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, {
    currentMatch: null,
    phase: "waiting",
    timeRemaining: 0,
    isGateOpen: false,
  });

  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
}

// Hook
export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGame must be used within GameProvider");
  }
  return context;
};

export type { GameState, GameAction, Match, Fighter, GamePhase, User, Bet };
