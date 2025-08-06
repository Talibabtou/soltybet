# SoltyBet Modern Rebuild Guide

## 🎯 Overview

This guide outlines how to rebuild SoltyBet from scratch using modern, efficient technologies while maintaining the same core functionality and smart contract infrastructure.

## 🆚 Current vs. Modern Stack

### Current Stack Issues

- **Complex Docker Swarm**: Over-engineered for current scale
- **Django + Python**: Heavy backend framework for simple API needs
- **Mixed Python/Node.js Oracle**: Inconsistent technology stack
- **PostgreSQL Self-hosting**: Infrastructure overhead
- **Custom Authentication**: Reinventing the wheel
- **Complex WebSocket Management**: Manual Redis management

### Technical Debt & Anti-Patterns to Avoid

**🚫 Code Smells Found in Current Codebase:**

- **Magic Numbers**: Hardcoded `44` for wallet length, `15` for fighter names
- **Duplicate Code**: Two separate scrapers (`oracle/` and `scraper/`) doing similar tasks
- **Global State**: Pandas options set globally affecting entire application
- **Hardcoded URLs**: `'wss://irc-ws.chat.twitch.tv:443'` repeated everywhere
- **Mixed Concerns**: UI components handling GIF caching and blockchain logic
- **Username-based Auth**: `if request.user.username.strip() != 'scrap'` - brittle security
- **Manual UUID Fields**: Custom `u_id`, `f_id`, `m_id` instead of standard `id`
- **Excessive Middleware**: 9+ Django middlewares for simple API
- **Complex Views**: 400+ line view methods with multiple responsibilities
- **No Error Boundaries**: Poor error handling and logging patterns
- **Async/Sync Mixing**: Inconsistent async patterns causing deadlocks

### Modern Stack Benefits

- **Simplified Deployment**: Vercel/Railway for instant deployments
- **Type Safety**: Full TypeScript stack
- **Better Performance**: Modern frameworks and edge computing
- **Managed Services**: Supabase for database and real-time features
- **Built-in Features**: Authentication, real-time updates, file storage

---

## 🏗️ Hybrid Architecture (Optimized for Cost & Reliability)

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Vercel (Free)  │    │  Hostinger VPS  │    │   TypeScript    │
│   Next.js       │◄──►│   PostgreSQL    │◄──►│    Oracle       │
│   Frontend      │    │   + API Layer   │    │   (Puppeteer)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Solana Network │    │ Wallet Manager  │    │   Twitch API    │
│ (Same Contract) │    │  Private Keys   │    │ (WebSocket/IRC) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 🎯 **Why Hybrid Approach?**

**Keep on Hostinger VPS (\$35/month):**

- ✅ **Oracle Service** (24/7 Puppeteer + Python/Node.js)
- ✅ **PostgreSQL Database** (Preserve existing fighter stats)
- ✅ **Wallet Management** (Private keys secure on VPS)
- ✅ **Bulk Transactions** (No serverless timeouts)
- ✅ **API Layer** (Flask endpoints for frontend)

**Deploy on Vercel (Free tier):**

- ✅ **Next.js Frontend** (Global CDN, instant deploys)
- ✅ **Static Assets** (Fast loading worldwide)
- ✅ **API Proxy** (Route frontend calls to VPS)

**Total Cost: \$35/month** (vs \$45/month+ for full serverless)

---

## 🚀 Step-by-Step Rebuild

### Phase 1: Project Setup (30 minutes)

#### 1.1 Initialize Next.js Project

```bash
npx create-next-app@latest soltybet-v2 --typescript --tailwind --eslint --app
cd soltybet-v2
```

#### 1.2 Install Dependencies

```bash
# Core dependencies (minimal set)
npm install @supabase/supabase-js @supabase/ssr
npm install @solana/web3.js @solana/wallet-adapter-react @solana/wallet-adapter-react-ui @solana/wallet-adapter-wallets
npm install @coral-xyz/anchor
npm install puppeteer
npm install ws @types/ws
npm install zod

# State management (choose ONE based on complexity)
# For simple state: use React's built-in useState/useContext
# For complex state: npm install @reduxjs/toolkit react-redux

# UI utilities (minimal)
npm install clsx tailwind-merge
npm install class-variance-authority  # For component variants

# Development dependencies
npm install -D @types/node
npm install -D tailwindcss-animate  # Only if animations needed
```

#### 1.3 Environment Setup

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_SOLANA_RPC_URL=your_solana_rpc_url
ORACLE_WALLET_PRIVATE_KEY=your_oracle_wallet_key
TWITCH_ACCESS_TOKEN=your_twitch_token
DISCORD_WEBHOOK_URL=your_discord_webhook
```

#### 1.4 Tailwind Configuration (Optimized)

```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          900: '#1e3a8a',
        },
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
  // Optimize for production
  purge: {
    enabled: process.env.NODE_ENV === 'production',
    content: [
      './pages/**/*.{js,ts,jsx,tsx}',
      './components/**/*.{js,ts,jsx,tsx}',
      './app/**/*.{js,ts,jsx,tsx}',
    ],
  },
}
```

### Phase 2: Database Migration Strategy (2 hours)

#### 2.1 Current v1 Database Analysis

**Existing PostgreSQL Schema (to preserve):**

```sql
-- Current v1 structure (Django models)
class Fighter(models.Model):
    f_id = UUIDField(primary_key=True)  # Keep existing IDs
    name = CharField(max_length=100, unique=True)
    nb_fight = PositiveIntegerField(default=0)  # Fight count
    nb_bet = PositiveIntegerField(default=0)    # Bet count
    win = PositiveIntegerField(default=0)       # Win count
    lose = PositiveIntegerField(default=0)      # Loss count
    elo = DecimalField(max_digits=10, decimal_places=2, default=1000)

class User(models.Model):
    u_id = UUIDField(primary_key=True)  # Keep existing IDs
    wallet_address = CharField(max_length=44, unique=True)
    # ... other fields

class Match(models.Model):
    m_id = UUIDField(primary_key=True)  # Keep existing IDs
    red_id = ForeignKey(Fighter)        # Red fighter
    blue_id = ForeignKey(Fighter)       # Blue fighter
    winner = ForeignKey(Fighter)        # Winner
    vol_red = DecimalField()            # Red volume
    vol_blue = DecimalField()           # Blue volume
    # ... other fields
```

#### 2.2 Migration Strategy: Preserve Data + Modernize

**🎯 Critical Data to Preserve:**

- ✅ **Fighter statistics** (names, ELO, win/loss records)
- ✅ **User wallet addresses** and betting history
- ✅ **Match history** for analytics
- ✅ **Existing UUIDs** (maintain referential integrity)

#### 2.3 Enhanced Schema (Backward Compatible)

```sql
-- 🔄 MIGRATION-FRIENDLY SCHEMA (Keep existing data + add new features)

-- Add new types for enhanced features
CREATE TYPE game_phase AS ENUM ('waiting', 'betting', 'locked', 'fighting', 'finished');
CREATE TYPE bet_team AS ENUM ('red', 'blue');

-- 1. FIGHTERS TABLE: Enhance existing structure
-- ✅ Keep existing f_id as primary key (preserve data)
-- ✅ Keep existing field names (nb_fight, win, lose)
-- ✅ Add new mobile-friendly fields
ALTER TABLE datalog_fighter RENAME TO fighters;
ALTER TABLE fighters RENAME COLUMN f_id TO id;
ALTER TABLE fighters RENAME COLUMN nb_fight TO fight_count;
ALTER TABLE fighters RENAME COLUMN nb_bet TO bet_count;
ALTER TABLE fighters RENAME COLUMN win TO wins;
ALTER TABLE fighters RENAME COLUMN lose TO losses;

-- Add new fields for enhanced features
ALTER TABLE fighters ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE fighters ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE fighters ADD COLUMN IF NOT EXISTS tier CHAR(1) DEFAULT 'B'; -- S, A, B, C, D tiers
ALTER TABLE fighters ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 2. USERS TABLE: Modernize user structure
-- ✅ Keep existing u_id as primary key (preserve user data)
ALTER TABLE datalog_user RENAME TO users;
ALTER TABLE users RENAME COLUMN u_id TO id;

-- Add mobile-friendly fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_volume DECIMAL(12,4) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_payout DECIMAL(12,4) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3. MATCHES TABLE: Enhanced match tracking
-- ✅ Keep existing m_id as primary key (preserve match history)
ALTER TABLE datalog_match RENAME TO matches;
ALTER TABLE matches RENAME COLUMN m_id TO id;
ALTER TABLE matches RENAME COLUMN red_id TO red_fighter_id;
ALTER TABLE matches RENAME COLUMN blue_id TO blue_fighter_id;
ALTER TABLE matches RENAME COLUMN nb_bet TO bet_count;
ALTER TABLE matches RENAME COLUMN vol_red TO volume_red;
ALTER TABLE matches RENAME COLUMN vol_blue TO volume_blue;
ALTER TABLE matches RENAME COLUMN creation_date TO created_at;

-- Add new phase tracking
ALTER TABLE matches ADD COLUMN IF NOT EXISTS phase game_phase DEFAULT 'finished';
ALTER TABLE matches ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 4. BETS TABLE: Enhanced bet tracking
-- ✅ Keep existing b_id as primary key (preserve bet history)
ALTER TABLE datalog_bet RENAME TO bets;
ALTER TABLE bets RENAME COLUMN b_id TO id;
ALTER TABLE bets RENAME COLUMN m_id TO match_id;
ALTER TABLE bets RENAME COLUMN u_id TO user_id;
ALTER TABLE bets RENAME COLUMN f_id TO fighter_id;
ALTER TABLE bets RENAME COLUMN creation_date TO created_at;

-- Add team enum type
ALTER TABLE bets ALTER COLUMN team TYPE bet_team USING team::bet_team;
ALTER TABLE bets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 5. NEW MOBILE-FRIENDLY INDEXES
CREATE INDEX IF NOT EXISTS idx_fighters_elo ON fighters(elo DESC);
CREATE INDEX IF NOT EXISTS idx_fighters_tier ON fighters(tier, elo DESC);
CREATE INDEX IF NOT EXISTS idx_fighters_wins ON fighters(wins DESC);
CREATE INDEX IF NOT EXISTS idx_users_volume ON users(total_volume DESC);
CREATE INDEX IF NOT EXISTS idx_matches_recent ON matches(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_matches_phase ON matches(phase) WHERE phase IN ('betting', 'locked');

-- 6. DATA MIGRATION HELPERS
-- Update fighter tiers based on ELO
UPDATE fighters SET tier = CASE
    WHEN elo >= 1400 THEN 'S'
    WHEN elo >= 1200 THEN 'A'
    WHEN elo >= 1000 THEN 'B'
    WHEN elo >= 800 THEN 'C'
    ELSE 'D'
END;

-- Calculate user totals from existing bets
UPDATE users SET
    total_volume = (
        SELECT COALESCE(SUM(volume), 0)
        FROM bets
        WHERE user_id = users.id
    ),
    total_payout = (
        SELECT COALESCE(SUM(payout), 0)
        FROM bets
        WHERE user_id = users.id
    );
```

#### 2.4 Migration Execution Plan

**Step 1: Backup Current Database**

```bash
# On VPS - backup existing data
pg_dump soltybet_db > backup_$(date +%Y%m%d_%H%M%S).sql
```

**Step 2: Run Migration Script**

```bash
# Apply schema changes while preserving data
psql soltybet_db < migration_v1_to_v2.sql
```

**Step 3: Verify Data Integrity**

```sql
-- Verify fighter data preserved
SELECT COUNT(*) FROM fighters;
SELECT name, fight_count, wins, losses, elo FROM fighters ORDER BY elo DESC LIMIT 10;

-- Verify user data preserved
SELECT COUNT(*) FROM users;
SELECT wallet_address, total_volume FROM users WHERE total_volume > 0 LIMIT 10;
```

#### 2.5 VPS API Layer Setup

**Create Flask API on VPS to serve the frontend:**

```python
# vps_api/server.py - Simple API layer for PostgreSQL
from flask import Flask, jsonify, request
from flask_cors import CORS
import psycopg2
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Database connection
def get_db_connection():
    return psycopg2.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        database=os.getenv('DB_NAME', 'soltybet_db'),
        user=os.getenv('DB_USER', 'postgres'),
        password=os.getenv('DB_PASSWORD')
    )

@app.route('/api/fighters/top', methods=['GET'])
def get_top_fighters():
    """Get top fighters by ELO for mobile app"""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT id, name, fight_count, wins, losses, elo, tier
        FROM fighters
        WHERE is_active = true
        ORDER BY elo DESC
        LIMIT 20
    """)

    fighters = []
    for row in cursor.fetchall():
        fighters.append({
            'id': str(row[0]),
            'name': row[1],
            'fight_count': row[2],
            'wins': row[3],
            'losses': row[4],
            'elo': float(row[5]),
            'tier': row[6],
            'win_rate': round(row[3] / max(row[2], 1) * 100, 1)
        })

    conn.close()
    return jsonify(fighters)

@app.route('/api/matches/current', methods=['GET'])
def get_current_match():
    """Get current match data"""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT m.id, m.phase, m.volume_red, m.volume_blue, m.bet_count,
               rf.name as red_name, rf.elo as red_elo, rf.tier as red_tier,
               bf.name as blue_name, bf.elo as blue_elo, bf.tier as blue_tier
        FROM matches m
        JOIN fighters rf ON m.red_fighter_id = rf.id
        JOIN fighters bf ON m.blue_fighter_id = bf.id
        WHERE m.phase IN ('betting', 'locked', 'fighting')
        ORDER BY m.created_at DESC
        LIMIT 1
    """)

    result = cursor.fetchone()
    if result:
        match = {
            'id': str(result[0]),
            'phase': result[1],
            'volume_red': float(result[2]),
            'volume_blue': float(result[3]),
            'bet_count': result[4],
            'red_fighter': {
                'name': result[5],
                'elo': float(result[6]),
                'tier': result[7]
            },
            'blue_fighter': {
                'name': result[8],
                'elo': float(result[9]),
                'tier': result[10]
            }
        }
    else:
        match = None

    conn.close()
    return jsonify(match)

@app.route('/api/bets', methods=['POST'])
def log_bet():
    """Log bet for tracking (called by frontend after Solana transaction)"""
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()

    # Insert bet record
    cursor.execute("""
        INSERT INTO bets (user_id, match_id, fighter_id, team, volume, tx_in)
        VALUES (%s, %s, %s, %s, %s, %s)
        RETURNING id
    """, (
        data['user_id'],
        data['match_id'],
        data['fighter_id'],
        data['team'],
        data['volume'],
        data['tx_signature']
    ))

    bet_id = cursor.fetchone()[0]
    conn.commit()
    conn.close()

    return jsonify({'success': True, 'bet_id': str(bet_id)})

@app.route('/api/gate/status', methods=['GET'])
def get_gate_status():
    """Check if betting gate is open (called by oracle)"""
    # This will be implemented by your existing oracle service
    return jsonify({'is_open': True})  # Placeholder

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3001, debug=False)
```

**Frontend Database Client Setup:**

```typescript
// lib/api/client.ts - Frontend API client
const VPS_API_URL =
  process.env.NEXT_PUBLIC_VPS_API_URL || 'https://your-vps-domain.com/api'

class ApiClient {
  private baseUrl: string

  constructor() {
    this.baseUrl = VPS_API_URL
  }

  async get(endpoint: string) {
    const response = await fetch(`${this.baseUrl}${endpoint}`)
    if (!response.ok) throw new Error(`API Error: ${response.statusText}`)
    return response.json()
  }

  async post(endpoint: string, data: any) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error(`API Error: ${response.statusText}`)
    return response.json()
  }

  // Specific methods for mobile app
  async getCurrentMatch() {
    return this.get('/matches/current')
  }

  async getTopFighters() {
    return this.get('/fighters/top')
  }

  async logBet(betData: any) {
    return this.post('/bets', betData)
  }

  async getGateStatus() {
    return this.get('/gate/status')
  }
}

export const apiClient = new ApiClient()
```

### Phase 3: Mobile-First Frontend with Next.js (3 hours)

#### 3.1 Enhanced Frontend Architecture

**🎯 Mobile-First Design Principles:**

- ✅ **Responsive Design** (Tailwind breakpoints: mobile → tablet → desktop)
- ✅ **Touch-Friendly UI** (Large buttons, swipe gestures)
- ✅ **Fast Loading** (Image optimization, lazy loading)
- ✅ **Offline-Ready** (Service worker, cached data)
- ✅ **PWA Support** (Install prompt, app-like experience)

#### 3.2 Solana Wallet Integration (Mobile Compatible)

```typescript
// components/providers/WalletProvider.tsx
'use client'
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets'
import { clusterApiUrl } from '@solana/web3.js'
import { useMemo } from 'react'

require('@solana/wallet-adapter-react-ui/styles.css')

export function SolanaWalletProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const network = WalletAdapterNetwork.Mainnet
  const endpoint = useMemo(() => clusterApiUrl(network), [network])
  const wallets = useMemo(() => [new PhantomWalletAdapter()], [])

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}
```

#### 3.2 State Management (Choose Based on Complexity)

**Option A: Simple React Context (Recommended for minimal state)**

```typescript
// contexts/GameContext.tsx
'use client'
import { createContext, useContext, useReducer, ReactNode } from 'react'

interface GameState {
  currentMatch: Match | null
  phase: 'waiting' | 'betting' | 'locked' | 'fighting' | 'finished'
  timeRemaining: number
}

type GameAction =
  | { type: 'SET_MATCH'; payload: Match }
  | { type: 'SET_PHASE'; payload: GameState['phase'] }
  | { type: 'SET_TIME'; payload: number }

const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case 'SET_MATCH':
      return { ...state, currentMatch: action.payload }
    case 'SET_PHASE':
      return { ...state, phase: action.payload }
    case 'SET_TIME':
      return { ...state, timeRemaining: action.payload }
    default:
      return state
  }
}

const GameContext = createContext<{
  state: GameState
  dispatch: React.Dispatch<GameAction>
} | null>(null)

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, {
    currentMatch: null,
    phase: 'waiting',
    timeRemaining: 0,
  })

  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  )
}

export const useGame = () => {
  const context = useContext(GameContext)
  if (!context) throw new Error('useGame must be used within GameProvider')
  return context
}
```

**Option B: Redux Toolkit (For complex state with multiple features)**

```typescript
// store/gameSlice.ts (only if using Redux)
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface GameState {
  currentMatch: Match | null
  phase: 'waiting' | 'betting' | 'locked' | 'fighting' | 'finished'
  timeRemaining: number
}

const gameSlice = createSlice({
  name: 'game',
  initialState: {
    currentMatch: null,
    phase: 'waiting',
    timeRemaining: 0,
  } as GameState,
  reducers: {
    setMatch: (state, action: PayloadAction<Match>) => {
      state.currentMatch = action.payload
    },
    setPhase: (state, action: PayloadAction<GameState['phase']>) => {
      state.phase = action.payload
    },
    setTime: (state, action: PayloadAction<number>) => {
      state.timeRemaining = action.payload
    },
  },
})

export const { setMatch, setPhase, setTime } = gameSlice.actions
export default gameSlice.reducer
```

#### 3.3 Real-time Updates

```typescript
// hooks/useRealTimeMatches.ts
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useGame } from '@/contexts/GameContext' // if using Context
// import { useDispatch } from 'react-redux' // if using Redux

export function useRealTimeMatches() {
  const { dispatch } = useGame() // Context version
  // const dispatch = useDispatch() // Redux version
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel('matches')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            // Context version
            dispatch({ type: 'SET_MATCH', payload: payload.new as Match })
            dispatch({ type: 'SET_PHASE', payload: payload.new.phase })

            // Redux version (uncomment if using Redux)
            // dispatch(setMatch(payload.new as Match))
            // dispatch(setPhase(payload.new.phase))
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [dispatch])
}
```

#### 3.4 Optimized UI Components & Utils

**Tailwind Utilities (Lightweight approach)**

```typescript
// lib/utils.ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

**Simple Button Component**

```typescript
// components/ui/Button.tsx
import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)

export { Button, buttonVariants }
```

**Betting Interface (No framer-motion, using CSS transitions)**

```typescript
// components/BettingInterface.tsx
'use client'
import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

export function BettingInterface() {
  const { connected, publicKey } = useWallet()
  const [betAmount, setBetAmount] = useState('')
  const [selectedTeam, setSelectedTeam] = useState<'red' | 'blue' | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleBet = async () => {
    if (!connected || !publicKey) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/bets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: publicKey.toString(),
          team: selectedTeam,
          amount: parseFloat(betAmount),
        }),
      })

      if (response.ok) {
        setBetAmount('')
        setSelectedTeam(null)
      }
    } catch (error) {
      console.error('Bet failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-gradient-to-br from-purple-900 to-blue-900 p-6 rounded-xl transform transition-all duration-200 hover:scale-[1.02]">
      <div className="grid grid-cols-2 gap-4 mb-4">
        <Button
          variant={selectedTeam === 'red' ? 'default' : 'outline'}
          onClick={() => setSelectedTeam('red')}
          className={cn(
            'bg-red-600 hover:bg-red-700 border-red-500',
            selectedTeam === 'red' && 'ring-2 ring-red-400',
          )}
        >
          Red Corner
        </Button>
        <Button
          variant={selectedTeam === 'blue' ? 'default' : 'outline'}
          onClick={() => setSelectedTeam('blue')}
          className={cn(
            'bg-blue-600 hover:bg-blue-700 border-blue-500',
            selectedTeam === 'blue' && 'ring-2 ring-blue-400',
          )}
        >
          Blue Corner
        </Button>
      </div>

      <input
        type="number"
        placeholder="Bet amount (SOL)"
        value={betAmount}
        onChange={(e) => setBetAmount(e.target.value)}
        className="w-full p-3 mb-4 rounded-md bg-white/10 border border-white/20 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-purple-400"
        step="0.01"
        min="0"
      />

      <Button
        onClick={handleBet}
        disabled={!connected || !selectedTeam || !betAmount || isLoading}
        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
      >
        {isLoading ? 'Placing Bet...' : 'Place Bet'}
      </Button>
    </div>
  )
}
```

### Phase 4: API Routes (1 hour)

#### 4.1 Bet Placement API

```typescript
// app/api/bets/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const betSchema = z.object({
  wallet: z.string(),
  team: z.enum(['red', 'blue']),
  amount: z.number().positive(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { wallet, team, amount } = betSchema.parse(body)

    const supabase = createServerClient()

    // Get or create user
    const { data: user } = await supabase
      .from('users')
      .upsert({ wallet_address: wallet })
      .select()
      .single()

    // Get current match
    const { data: match } = await supabase
      .from('matches')
      .select('*')
      .eq('phase', 'betting')
      .single()

    if (!match) {
      return NextResponse.json({ error: 'No active betting' }, { status: 400 })
    }

    // Create bet record
    const { data: bet } = await supabase
      .from('bets')
      .insert({
        user_id: user.id,
        match_id: match.id,
        fighter_id:
          team === 'red' ? match.red_fighter_id : match.blue_fighter_id,
        team,
        volume: amount,
      })
      .select()
      .single()

    return NextResponse.json(bet)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to place bet' }, { status: 500 })
  }
}
```

#### 4.2 Match Data API

```typescript
// app/api/matches/current/route.ts
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createServerClient()

  const { data: match } = await supabase
    .from('matches')
    .select(
      `
      *,
      red_fighter:fighters!red_fighter_id(*),
      blue_fighter:fighters!blue_fighter_id(*),
      winner:fighters!winner_id(*)
    `,
    )
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return NextResponse.json(match)
}
```

### Phase 5: TypeScript Oracle with Puppeteer (2 hours)

#### 5.1 Clean Oracle Service (Avoiding Current Issues)

**🎯 Improvements over current oracle:**

- Single responsibility (no dual oracle/scraper setup)
- Configuration constants instead of hardcoded values
- Proper error handling and retry logic
- Clean separation of concerns
- Type safety throughout

```typescript
// lib/constants.ts (No more hardcoded values!)
export const SOLANA_CONFIG = {
  PROGRAM_ID: '5awMTFDmJv3EXEPstpJKD6fJ6FrLfcBw5Ek5CeutvKcM',
  GATE_SEED: 'deposit_gate',
} as const

export const TWITCH_CONFIG = {
  WS_URL: 'wss://irc-ws.chat.twitch.tv:443',
  NICK: 'justinfan12345',
  ROOM_ID: '43201452',
  USER_ID: '55853880',
  CHANNEL: 'saltybet',
} as const

export const PHASE_TRIGGERS = {
  BETS_OPEN: 'Bets are OPEN!',
  BETS_LOCKED: 'Bets are locked',
  MATCH_END: 'Tournament mode will be activated',
} as const

// services/oracle/index.ts (Clean, single responsibility)
import puppeteer, { Browser, Page } from 'puppeteer'
import { createServerClient } from '@/lib/supabase/server'
import { Connection, PublicKey, Keypair } from '@solana/web3.js'
import { AnchorProvider, Wallet, Program } from '@coral-xyz/anchor'
import { SOLANA_CONFIG, TWITCH_CONFIG, PHASE_TRIGGERS } from '@/lib/constants'

interface GameState {
  phase: string
  redFighter?: string
  blueFighter?: string
  matchId?: string
}

export class SoltyOracle {
  private browser: Browser | null = null
  private page: Page | null = null
  private supabase = createServerClient()
  private connection: Connection
  private wallet: Wallet
  private currentState: GameState = { phase: 'waiting' }

  constructor() {
    if (!process.env.NEXT_PUBLIC_SOLANA_RPC_URL) {
      throw new Error('SOLANA_RPC_URL environment variable is required')
    }
    if (!process.env.ORACLE_WALLET_PRIVATE_KEY) {
      throw new Error(
        'ORACLE_WALLET_PRIVATE_KEY environment variable is required',
      )
    }

    this.connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL)
    const privateKey = JSON.parse(process.env.ORACLE_WALLET_PRIVATE_KEY)
    const keypair = Keypair.fromSecretKey(new Uint8Array(privateKey))
    this.wallet = new Wallet(keypair)
  }

  async initialize(): Promise<void> {
    try {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      })
      this.page = await this.browser.newPage()
      await this.page.goto('https://www.saltybet.com/')

      await this.setupPageMonitoring()
    } catch (error) {
      console.error('Failed to initialize oracle:', error)
      throw error
    }
  }

  private async setupPageMonitoring(): Promise<void> {
    if (!this.page) throw new Error('Page not initialized')

    // Clean monitoring setup (no global state pollution)
    await this.page.evaluate((triggers) => {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList') {
            const phaseElement = document.querySelector('#betstatus')
            if (phaseElement?.textContent) {
              console.log('PHASE_CHANGE:', phaseElement.textContent)
            }
          }
        })
      })

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      })
    }, PHASE_TRIGGERS)

    // Clean event handling
    this.page.on('console', async (msg) => {
      if (msg.text().startsWith('PHASE_CHANGE:')) {
        const phase = msg.text().replace('PHASE_CHANGE:', '').trim()
        await this.handlePhaseChange(phase)
      }
    })
  }

  private async handlePhaseChange(phase: string): Promise<void> {
    if (this.currentState.phase === phase) return // Avoid duplicate processing

    this.currentState.phase = phase

    try {
      switch (phase) {
        case PHASE_TRIGGERS.BETS_OPEN:
          await this.handleBetsOpen()
          break
        case PHASE_TRIGGERS.BETS_LOCKED:
          await this.handleBetsLocked()
          break
        case PHASE_TRIGGERS.MATCH_END:
          await this.handleMatchEnd()
          break
      }
    } catch (error) {
      console.error(`Error handling phase change to ${phase}:`, error)
    }
  }

  private async handleBetsOpen(): Promise<void> {
    await Promise.all([
      this.setGateState(true),
      this.updateMatchPhase('waiting', 'betting'),
    ])
  }

  private async handleBetsLocked(): Promise<void> {
    await Promise.all([
      this.setGateState(false),
      this.updateMatchPhase('betting', 'locked'),
    ])
  }

  private async handleMatchEnd(): Promise<void> {
    await this.updateMatchPhase('locked', 'finished')
  }

  private async updateMatchPhase(from: string, to: string): Promise<void> {
    const { error } = await this.supabase
      .from('matches')
      .update({ phase: to })
      .eq('phase', from)

    if (error) {
      throw new Error(`Failed to update match phase: ${error.message}`)
    }
  }

  private async setGateState(isOpen: boolean): Promise<void> {
    try {
      const provider = new AnchorProvider(this.connection, this.wallet, {})
      const programId = new PublicKey(SOLANA_CONFIG.PROGRAM_ID)
      const program = await Program.at(programId, provider)

      const [gatePDA] = PublicKey.findProgramAddressSync(
        [Buffer.from(SOLANA_CONFIG.GATE_SEED)],
        programId,
      )

      await program.methods
        .setGate(isOpen)
        .accounts({
          gate: gatePDA,
          oracle: this.wallet.publicKey,
        })
        .rpc()
    } catch (error) {
      throw new Error(`Failed to set gate state: ${error}`)
    }
  }

  async cleanup(): Promise<void> {
    if (this.page) await this.page.close()
    if (this.browser) await this.browser.close()
  }
}
```

#### 5.2 Oracle API Route

```typescript
// app/api/oracle/route.ts
import { NextResponse } from 'next/server'
import { SoltyOracle } from '@/services/oracle'

let oracle: SoltyOracle | null = null

export async function POST() {
  if (!oracle) {
    oracle = new SoltyOracle()
    await oracle.initialize()
    await oracle.scrapeGameData()
  }

  return NextResponse.json({ status: 'Oracle started' })
}
```

### Phase 6: Smart Contract Integration (30 minutes)

#### 6.1 Solana Transaction Service

```typescript
// services/solana/transactions.ts
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
} from '@solana/web3.js'
import { AnchorProvider, Program } from '@coral-xyz/anchor'

export class SolanaService {
  private connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL!)

  async createBetTransaction(
    userWallet: PublicKey,
    amount: number,
    recipientWallet: PublicKey,
  ) {
    const transaction = new Transaction()

    // Check if gate is open first
    const isGateOpen = await this.checkGateStatus()
    if (!isGateOpen) {
      throw new Error('Betting is currently closed')
    }

    // Create transfer instruction
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: userWallet,
        toPubkey: recipientWallet,
        lamports: amount * 1e9, // Convert SOL to lamports
      }),
    )

    return transaction
  }

  async checkGateStatus(): Promise<boolean> {
    const programId = new PublicKey(
      '5awMTFDmJv3EXEPstpJKD6fJ6FrLfcBw5Ek5CeutvKcM',
    )
    const [gatePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('deposit_gate')],
      programId,
    )

    try {
      const accountInfo = await this.connection.getAccountInfo(gatePDA)
      if (!accountInfo) return false

      // Parse account data to get gate status
      const isOpen = accountInfo.data[8] === 1 // First byte after discriminator
      return isOpen
    } catch {
      return false
    }
  }
}
```

### Phase 7: Deployment (15 minutes)

#### 7.1 Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

#### 7.2 Environment Variables in Vercel

Add all environment variables from `.env.local` to Vercel dashboard

#### 7.3 Oracle Service Deployment

```typescript
// vercel.json
{
  "functions": {
    "app/api/oracle/route.ts": {
      "maxDuration": 300
    }
  }
}
```

---

## 🔧 Key Improvements

### Performance

- **Edge Functions**: Sub-100ms API responses
- **Static Generation**: Pre-rendered pages
- **Real-time Updates**: Instant UI updates via Supabase
- **Minimal Bundle**: Only essential dependencies
- **CSS-only Animations**: No heavy animation libraries

### Developer Experience

- **Full TypeScript**: End-to-end type safety
- **Modern Tooling**: Hot reload, built-in optimizations
- **Single Language**: TypeScript everywhere
- **Simplified State**: Choose between Context or Redux based on complexity
- **Utility-first CSS**: Tailwind with optimal configuration

### Scalability

- **Serverless**: Auto-scaling by default
- **CDN**: Global edge network
- **Managed Database**: Automatic backups and scaling
- **Lightweight Components**: Fast rendering and low memory usage

### Cost Optimization

- **No Infrastructure**: Pay-per-use
- **Efficient Queries**: Supabase query optimization
- **Edge Computing**: Reduced latency and costs
- **Minimal Dependencies**: Lower hosting costs and faster builds

---

## 🚦 Migration Strategy

### Phase 1: Parallel Development (1 week)

- Build new system alongside current one
- Test with subset of users
- Validate smart contract compatibility

### Phase 2: Data Migration (2 days)

- Export data from PostgreSQL
- Import to Supabase
- Verify data integrity

### Phase 3: Switch Over (1 day)

- Update DNS
- Monitor for issues
- Rollback plan ready

### Phase 4: Cleanup (1 week)

- Shut down old infrastructure
- Remove unused services
- Documentation updates

---

## 💰 Cost Comparison

### Current Costs (Monthly)

- VPS/Docker hosting: \$50-200
- PostgreSQL managed: \$25-100
- Redis: \$20-50
- SSL certificates: \$10-20
- **Total: \$105-370/month**

### Hybrid Approach (Monthly)

- **Hostinger VPS**: \$35/month (keep existing, well-configured)
- **Vercel Free**: \$0/month (frontend hosting)
- **Total: \$35/month**

### Full Serverless Alternative (Monthly)

- **Vercel Pro**: \$20/month (needed for oracle functions)
- **Supabase Pro**: \$25/month (managed database)
- **Total: \$45/month + usage fees**

**🎯 Hybrid = 67-90% cost reduction vs current**
**🎯 Hybrid = 22% cheaper than full serverless**

---

## 🎯 Timeline Summary (Hybrid Approach)

| Phase | Task                       | Time    | Total         |
| ----- | -------------------------- | ------- | ------------- |
| 1     | Project Setup              | 30 min  | 30 min        |
| 2     | Database Migration         | 2 hours | 2h 30min      |
| 3     | Mobile-First Frontend      | 3 hours | 5h 30min      |
| 4     | VPS API Layer              | 1 hour  | 6h 30min      |
| 5     | Oracle Enhancement         | 1 hour  | 7h 30min      |
| 6     | Smart Contract Integration | 30 min  | 8h            |
| 7     | Deployment & Testing       | 30 min  | **8.5 hours** |

**Total rebuild time: ~1.5 days of focused development**

### 🎯 Key Milestones

**Week 1: Foundation**

- ✅ Database migration (preserve fighter stats)
- ✅ Basic mobile-responsive frontend
- ✅ VPS API layer setup

**Week 2: Enhancement**

- ✅ Advanced mobile features (PWA, touch gestures)
- ✅ Real-time betting integration
- ✅ Performance optimization

**Week 3: Production**

- ✅ Full testing across devices
- ✅ Production deployment
- ✅ Data verification & monitoring

---

## 🔒 Security Enhancements

### Built-in Security

- **Row Level Security**: Supabase automatic policies
- **API Rate Limiting**: Vercel built-in protection
- **Environment Isolation**: Secure secret management

### Smart Contract Security

- **Same Contract**: No security changes needed
- **Oracle Verification**: TypeScript type safety
- **Transaction Validation**: Client-side verification

---

## 📈 Monitoring & Analytics

### Built-in Monitoring

- **Vercel Analytics**: Performance monitoring
- **Supabase Dashboard**: Database analytics
- **Real-time Logs**: Automatic error tracking

### Custom Metrics

```typescript
// lib/analytics.ts
export const trackBet = async (data: {
  amount: number
  team: 'red' | 'blue'
  user: string
}) => {
  await fetch('/api/analytics/bet', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}
```

---

## 🎉 Benefits Summary (Hybrid Approach)

1. **Data Preservation**: Keep all fighter stats and betting history intact
2. **90% Less Code**: Modern frameworks handle boilerplate
3. **10x Faster Development**: Built-in features and tooling
4. **Mobile-First Design**: Responsive, touch-friendly, PWA-ready
5. **Cost Optimization**: 67-90% reduction vs current setup
6. **Security**: Private keys stay on secured VPS
7. **Reliability**: 24/7 oracle service with no serverless timeouts
8. **Performance**: Global CDN frontend + fast VPS backend
9. **Type Safety**: End-to-end TypeScript
10. **Easy Migration**: Gradual transition, rollback-ready

## 🚫 Technical Debt Avoided

### From Current Codebase Analysis:

1. **No Magic Numbers**: All constants in configuration files
2. **No Duplicate Services**: Single oracle instead of oracle+scraper
3. **No Global State Pollution**: Clean encapsulation
4. **No Mixed Concerns**: UI components don't handle blockchain logic
5. **No Username-based Auth**: Proper role-based permissions
6. **No Custom UUID Fields**: Standard database patterns
7. **No Excessive Middleware**: Minimal, focused stack
8. **No 400+ Line Methods**: Single responsibility functions
9. **No Hardcoded URLs**: Environment-based configuration
10. **No Async/Sync Mixing**: Consistent async patterns

## 📋 Decision Guidelines

### When to Use React Context:

- Simple state (≤5 state properties)
- Single feature betting app
- Minimal team size

### When to Use Redux Toolkit:

- Complex state (multiple features, user management, analytics)
- Large team development
- Need time-travel debugging

### Tailwind Optimization:

- Use `purge` configuration to remove unused CSS
- Prefer utility classes over custom CSS
- Use `clsx` and `tailwind-merge` for conditional classes

## 🎓 Learning from Mistakes

**The current codebase shows classic "first project" patterns:**

- Over-engineering simple problems (Docker Swarm for a betting app)
- Copy-pasting solutions without understanding (duplicate oracle services)
- Not using framework conventions (custom UUID fields instead of `id`)
- Adding complexity instead of solving root causes (9 middleware layers)

**The rebuild follows "simplicity-first" principles:**

- Use managed services instead of self-hosting
- Choose the right tool for the job (Puppeteer > IRC parsing)
- Follow established conventions (standard database schema)
- Start simple, scale when needed (Context > Redux initially)

This rebuild transforms a complex, multi-service architecture into a modern, efficient, and maintainable application while preserving all existing functionality and smart contract compatibility. Most importantly, it avoids the technical debt and anti-patterns found in the original implementation, resulting in a codebase that's 90% smaller, 10x faster to develop, and significantly easier to maintain.

---

## 🎮 Alternative: Custom Game Engine Approach

### Problem with Current Stream-Based Solution

- **Browser Compatibility**: Stream doesn't work on Brave browser
- **Advertisement Interruptions**: Ads disrupt user experience and betting flow
- **External Dependencies**: Relying on third-party stream availability
- **No Control**: Can't customize game rules, timing, or character balance

### Solution: Build Custom Fighting Game Engine

Using [Ikemen-GO](https://github.com/ikemen-engine/Ikemen-GO), an open-source fighting game engine that supports MUGEN resources, we can create our own controlled environment.

#### 🎯 Benefits of Custom Game Engine

**Technical Advantages:**

- **Full Control**: No external stream dependencies
- **No Ads**: Clean, uninterrupted gameplay
- **Browser Compatibility**: Works everywhere the web app works
- **Customizable Timing**: Perfect betting windows
- **API Integration**: Direct game state → betting system

**Business Advantages:**

- **Consistent Uptime**: No stream outages
- **Predictable Matches**: Controlled timing and fairness
- **Brand Experience**: Custom UI/UX matching betting platform
- **Data Collection**: Complete match analytics and player behavior

#### 💰 Cost Analysis: Custom Game vs. Stream Scraping

**Current Stream-Based Approach Issues:**

- Browser compatibility problems
- Ad interruptions affecting user experience
- Unpredictable timing for betting windows
- Dependency on external service availability

**Custom Game Engine Costs:**

| Component                 | Time Investment | Complexity | Cost Estimate             |
| ------------------------- | --------------- | ---------- | ------------------------- |
| **Ikemen-GO Setup**       | 1-2 days        | Low        | \$0 (Open Source)         |
| **Character Integration** | 2-3 weeks       | Medium     | 10k+ characters available |
| **Web Integration**       | 1 week          | Medium     | Canvas/WebGL embedding    |
| **Game State API**        | 3-5 days        | Low        | Real-time betting sync    |
| **Character Balancing**   | 2-4 weeks       | High       | Tier system recreation    |
| **UI/UX Integration**     | 1 week          | Medium     | Match SoltyBet design     |

**Total Development Time: 6-10 weeks**
**Total Cost: \$0 in licensing + development time**

#### 🚀 Implementation Strategy

**Phase 1: Engine Setup (1 week)**

```bash
# Clone Ikemen-GO
git clone https://github.com/ikemen-engine/Ikemen-GO.git
cd Ikemen-GO

# Build for web (requires Go environment)
make build

# Test with default characters
./Ikemen_GO
```

**Phase 2: Character Integration (2-3 weeks)**

- Download characters from [MUGEN Archive](https://mugenarchive.com/forums/downloads.php?do=cat&id=1-characters)
- Organize into tier system (recreating current 10k character database)
- Balance character stats for fair matches
- Create automated character selection system

**Phase 3: Web Integration (1 week)**

```typescript
// components/GameEngine.tsx
'use client'
import { useEffect, useRef } from 'react'
import { useGame } from '@/contexts/GameContext'

export function GameEngine() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { dispatch } = useGame()

  useEffect(() => {
    // Initialize Ikemen-GO in web canvas
    const initGame = async () => {
      const canvas = canvasRef.current
      if (!canvas) return

      // WebAssembly build of Ikemen-GO
      const game = await import('../lib/ikemen-wasm')

      // Game state callbacks
      game.onMatchStart = (data) => {
        dispatch({ type: 'SET_MATCH', payload: data })
        dispatch({ type: 'SET_PHASE', payload: 'betting' })
      }

      game.onMatchEnd = (winner) => {
        dispatch({ type: 'SET_PHASE', payload: 'finished' })
        // Trigger payout calculations
      }

      game.initialize(canvas)
    }

    initGame()
  }, [dispatch])

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-96 border rounded-lg"
      width={800}
      height={600}
    />
  )
}
```

**Phase 4: Game State API (3-5 days)**

```typescript
// app/api/game/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const { action, data } = await request.json()
  const supabase = createServerClient()

  switch (action) {
    case 'match_start':
      // Create new match in database
      const { data: match } = await supabase
        .from('matches')
        .insert({
          red_fighter_id: data.redFighter,
          blue_fighter_id: data.blueFighter,
          phase: 'betting',
        })
        .select()
        .single()

      return NextResponse.json(match)

    case 'betting_closed':
      // Update match phase
      await supabase
        .from('matches')
        .update({ phase: 'fighting' })
        .eq('id', data.matchId)

      return NextResponse.json({ success: true })

    case 'match_end':
      // Record winner and trigger payouts
      await supabase
        .from('matches')
        .update({
          winner_id: data.winnerId,
          phase: 'finished',
        })
        .eq('id', data.matchId)

      return NextResponse.json({ success: true })
  }
}
```

#### 🎮 Character Management System

**Leveraging MUGEN Archive Resources:**

- 10,000+ characters available from community
- Pre-existing sprite work and animations
- Established character movesets and balance
- Community-driven content updates

**Tier System Recreation:**

```typescript
// lib/character-tiers.ts
export const CHARACTER_TIERS = {
  S: { multiplier: 1.2, rarity: 0.05 }, // Strongest characters
  A: { multiplier: 1.1, rarity: 0.15 },
  B: { multiplier: 1.0, rarity: 0.3 },
  C: { multiplier: 0.9, rarity: 0.35 },
  D: { multiplier: 0.8, rarity: 0.15 }, // Weakest characters
} as const

export function selectBalancedMatch() {
  // Algorithm to ensure fair, entertaining matches
  // Similar to current SaltyBet tier system
}
```

#### 📊 Advantages Over Stream Scraping

**Reliability:**

- ✅ No external dependencies
- ✅ Predictable uptime (99.9%)
- ✅ Controlled match timing
- ✅ No advertisement interruptions

**User Experience:**

- ✅ Works on all browsers (including Brave)
- ✅ Faster loading times
- ✅ Custom UI integration
- ✅ Better mobile experience

**Technical:**

- ✅ Direct API access to game state
- ✅ Real-time match data
- ✅ Custom match rules
- ✅ Automated tournament modes

**Business:**

- ✅ Complete control over content
- ✅ Ability to add sponsored characters
- ✅ Custom betting mechanics
- ✅ Data ownership and analytics

#### 🚧 Challenges & Solutions

**Challenge 1: Character Acquisition**

- **Solution**: Automated download from MUGEN Archive
- **Time**: 2-3 weeks for 10k characters
- **Cost**: Free (community resources)

**Challenge 2: Balance Recreation**

- **Solution**: Data analysis of current tier performance
- **Time**: 2-4 weeks of testing and adjustments
- **Resource**: Community feedback for balance validation

**Challenge 3: Web Performance**

- **Solution**: WebAssembly build of Ikemen-GO
- **Optimization**: Character preloading and caching
- **Fallback**: Cloud rendering for low-end devices

#### 💡 Recommendation

**Short-term (Current Rebuild):**

- Complete the Next.js/Supabase rebuild as planned
- Continue with stream scraping for immediate deployment

**Medium-term (Post-Launch):**

- Begin custom game engine development
- Run in parallel with existing system
- A/B test user engagement

**Long-term (3-6 months):**

- Full migration to custom game engine
- Enhanced betting features only possible with direct game control
- Community-driven character additions and tournaments

This approach eliminates streaming dependencies while potentially creating a superior user experience with the same character diversity and tier system that makes the current platform engaging.

---

## 📁 Final Project Structure

### ✅ Expected Directory Tree

```
soltybet/
├── soltybet-v1/                     # 🚫 Legacy (reference only)
│   ├── backend/                     # Django + complex middleware
│   ├── frontend/                    # React with technical debt
│   ├── oracle/                      # Mixed Python/Node.js
│   ├── scraper/                     # Duplicate functionality
│   └── smart-contract/              # Current Solana program
│
└── soltybet-v2/                     # ✅ Modern rebuild
    ├── 📄 Files (Root Level)
    │   ├── package.json             # Dependencies
    │   ├── package-lock.json        # Lock file
    │   ├── tsconfig.json            # TypeScript config
    │   ├── tailwind.config.ts       # Optimized Tailwind
    │   ├── next.config.ts           # Next.js config
    │   ├── eslint.config.mjs        # Linting rules
    │   ├── postcss.config.mjs       # PostCSS config
    │   ├── database-schema.sql      # Supabase schema
    │   ├── .env.example             # Environment template
    │   ├── .env.local               # Local environment (gitignored)
    │   ├── .gitignore               # Git ignore rules
    │   ├── REBUILD.md               # This guide
    │   └── README.md                # Project documentation
    │
    ├── 📁 src/                      # Source code
    │   ├── 📁 app/                  # Next.js 15 App Router
    │   │   ├── layout.tsx           # Root layout with providers
    │   │   ├── page.tsx             # Homepage component
    │   │   ├── globals.css          # Global styles
    │   │   ├── favicon.ico          # App icon
    │   │   │
    │   │   ├── 📁 api/              # API Routes (serverless)
    │   │   │   ├── 📁 bets/         # Betting endpoints
    │   │   │   │   └── route.ts     # POST /api/bets
    │   │   │   ├── 📁 matches/      # Match endpoints
    │   │   │   │   ├── route.ts     # GET /api/matches
    │   │   │   │   └── 📁 current/
    │   │   │   │       └── route.ts # GET /api/matches/current
    │   │   │   ├── 📁 oracle/       # Oracle endpoints
    │   │   │   │   └── route.ts     # POST /api/oracle (game state)
    │   │   │   └── 📁 solana/       # Blockchain endpoints
    │   │   │       ├── route.ts     # Transaction helpers
    │   │   │       └── 📁 gate/
    │   │   │           └── route.ts # GET /api/solana/gate (gate status)
    │   │   │
    │   │   ├── 📁 betting/          # Betting pages (future)
    │   │   │   └── page.tsx         # Dedicated betting interface
    │   │   ├── 📁 matches/          # Match history (future)
    │   │   │   └── page.tsx         # Match list/details
    │   │   └── 📁 stats/            # Statistics (future)
    │   │       └── page.tsx         # User/fighter stats
    │   │
    │   ├── 📁 components/           # Reusable components
    │   │   ├── 📁 ui/               # Base UI components
    │   │   │   ├── Button.tsx       # Button with variants
    │   │   │   ├── Input.tsx        # Form inputs (future)
    │   │   │   ├── Card.tsx         # Card layouts (future)
    │   │   │   ├── Modal.tsx        # Modal dialogs (future)
    │   │   │   └── LoadingSpinner.tsx # Loading states (future)
    │   │   │
    │   │   ├── 📁 providers/        # Context providers
    │   │   │   ├── WalletProvider.tsx    # Solana wallet integration
    │   │   │   └── ThemeProvider.tsx     # Theme switching (future)
    │   │   │
    │   │   ├── 📁 betting/          # Betting-specific components
    │   │   │   ├── BettingInterface.tsx  # Main betting UI
    │   │   │   ├── MatchDisplay.tsx      # Match info display
    │   │   │   ├── VolumeDisplay.tsx     # Betting volumes
    │   │   │   └── BetHistory.tsx        # User bet history (future)
    │   │   │
    │   │   ├── 📁 game/             # Game-specific components
    │   │   │   ├── StreamEmbed.tsx       # Twitch/game stream
    │   │   │   ├── FighterCard.tsx       # Fighter info cards
    │   │   │   ├── PhaseIndicator.tsx    # Game phase display
    │   │   │   └── GameEngine.tsx        # Custom game engine (future)
    │   │   │
    │   │   └── 📁 layout/           # Layout components
    │   │       ├── Navbar.tsx            # Navigation bar
    │   │       ├── Sidebar.tsx           # Side navigation (future)
    │   │       └── Footer.tsx            # Page footer (future)
    │   │
    │   ├── 📁 contexts/             # React Context providers
    │   │   ├── GameContext.tsx           # Game state management
    │   │   ├── UserContext.tsx           # User data (future)
    │   │   └── NotificationContext.tsx   # Toast notifications (future)
    │   │
    │   ├── 📁 hooks/                # Custom React hooks
    │   │   ├── useRealTimeMatches.ts     # Supabase real-time updates
    │   │   ├── useSolanaTransaction.ts   # Blockchain transactions
    │   │   ├── useLocalStorage.ts        # Persistent local state
    │   │   └── useWebSocket.ts           # WebSocket connections
    │   │
    │   ├── 📁 lib/                  # Utility libraries
    │   │   ├── utils.ts                  # General utilities (cn, etc.)
    │   │   ├── constants.ts              # App constants
    │   │   ├── validations.ts            # Zod schemas
    │   │   │
    │   │   ├── 📁 supabase/         # Database integration
    │   │   │   ├── client.ts             # Client-side Supabase
    │   │   │   ├── server.ts             # Server-side Supabase
    │   │   │   └── types.ts              # Database types
    │   │   │
    │   │   ├── 📁 solana/           # Blockchain integration
    │   │   │   ├── config.ts             # Solana configuration
    │   │   │   ├── transactions.ts       # Transaction builders
    │   │   │   ├── program.ts            # Smart contract interface
    │   │   │   └── utils.ts              # Blockchain utilities
    │   │   │
    │   │   └── 📁 oracle/           # Oracle services
    │   │       ├── puppeteer.ts          # Browser automation
    │   │       ├── twitch.ts             # Twitch integration
    │   │       └── game-state.ts         # Game state management
    │   │
    │   └── 📁 types/                # TypeScript definitions
    │       ├── database.ts               # Database types (generated)
    │       ├── solana.ts                 # Blockchain types
    │       ├── game.ts                   # Game-specific types
    │       └── api.ts                    # API response types
    │
    ├── 📁 public/                   # Static assets
    │   ├── favicon.ico               # App icon
    │   ├── logo.png                 # SoltyBet logo (future)
    │   ├── fighters/                # Fighter images (future)
    │   └── sounds/                  # Game sounds (future)
    │
    ├── 📁 .next/                    # Next.js build output (gitignored)
    ├── 📁 node_modules/             # Dependencies (gitignored)
    │
    └── 📁 docs/                     # Documentation (future)
        ├── deployment.md            # Deployment guide
        ├── api.md                   # API documentation
        └── contributing.md          # Contribution guide
```

### 🎯 Key Structure Principles

**1. Standard Next.js 15 App Router Structure**

- ✅ `src/app/` for pages and API routes
- ✅ `src/components/` for reusable UI
- ✅ Organized by feature, not by file type

**2. Blockchain-First Organization**

- ✅ `src/lib/solana/` for all blockchain logic
- ✅ `src/lib/supabase/` for database integration
- ✅ Clear separation of concerns

**3. Scalable Component Architecture**

- ✅ `src/components/ui/` for base components
- ✅ Feature-specific component folders
- ✅ Provider pattern for state management

**4. Development vs Production**

- ✅ All config files in root level
- ✅ Environment-based configuration
- ✅ Clear file naming conventions

### 📊 Structure Comparison

| Aspect                     | v1 (Bad)              | v2 (Good)             |
| -------------------------- | --------------------- | --------------------- |
| **Framework**              | Django + React        | Next.js 15            |
| **File Naming**            | Custom `u_id`, `f_id` | Standard `id`         |
| **State Management**       | Mixed approaches      | Unified Context/Hooks |
| **API Structure**          | Django views          | Next.js API routes    |
| **Component Organization** | Flat structure        | Feature-based folders |
| **Database Integration**   | Custom ORM setup      | Supabase with types   |
| **Build Process**          | Complex Docker        | Simple npm scripts    |

### 🚀 Migration Benefits

**Developer Experience:**

- 🔍 Easy to find files (feature-based organization)
- 🔧 Standard tooling (ESLint, TypeScript, Prettier)
- 🏃‍♂️ Fast development (Turbopack, hot reload)
- 📚 Clear patterns (hooks, components, API routes)

**Production Benefits:**

- ⚡ Fast builds (Next.js optimization)
- 🌐 Edge deployment (Vercel/Railway)
- 📊 Built-in analytics (Web Vitals)
- 🔒 Security by default (CSP, CORS)

### 📝 File Conventions

**Naming:**

- `PascalCase` for components and types
- `camelCase` for functions and variables
- `kebab-case` for routes and API endpoints
- `UPPER_CASE` for constants

**Extensions:**

- `.tsx` for React components
- `.ts` for utility functions and types
- `.css` for styles (minimal usage)
- `.sql` for database schemas

This structure supports the rebuild goals: **simplicity, maintainability, and scalability** while avoiding all the technical debt patterns found in v1.

---

## 🎯 Ultra-Minimalist Bootstrap Strategy

### Core Insight: The Gate is Everything, Everything Else is Optional

You're absolutely right about the gate! Without oracle-controlled betting windows, you just have a donation platform. The gate is the **only** complex piece you actually need.

#### 🎯 Perfect Smart Contract: Just Gate + Direct Transfer

```rust
// Absolutely minimal - keep only what matters
use anchor_lang::prelude::*;

declare_id!("YourProgramID");

#[program]
pub mod minimal_betting {
    use super::*;

    // Oracle controls when betting is allowed
    pub fn set_gate(ctx: Context<SetGate>, is_open: bool) -> Result<()> {
        ctx.accounts.gate.is_open = is_open;
        Ok(())
    }

    // Users can only bet when gate is open
    pub fn place_bet(
        ctx: Context<PlaceBet>,
        amount: u64,
    ) -> Result<()> {
        // THE ESSENTIAL CHECK - this is your entire business logic
        require!(ctx.accounts.gate.is_open, ErrorCode::BettingClosed);
        require!(amount >= 10_000_000, ErrorCode::MinimumBet); // 0.01 SOL

        // Direct SOL transfer - simplest possible
        **ctx.accounts.house.to_account_info().try_borrow_mut_lamports()? += amount;
        **ctx.accounts.user.to_account_info().try_borrow_mut_lamports()? -= amount;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct SetGate<'info> {
    #[account(mut, seeds = [b"gate"], bump, has_one = oracle)]
    pub gate: Account<'info, BettingGate>,
    pub oracle: Signer<'info>,
}

#[derive(Accounts)]
pub struct PlaceBet<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut)]
    /// CHECK: House wallet
    pub house: AccountInfo<'info>,

    #[account(seeds = [b"gate"], bump)]
    pub gate: Account<'info, BettingGate>,
}

#[account]
pub struct BettingGate {
    pub is_open: bool,
    pub oracle: Pubkey,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Betting is currently closed")]
    BettingClosed,
    #[msg("Minimum bet is 0.01 SOL")]
    MinimumBet,
}
```

**Why this is perfect:**

- ✅ Gate control prevents 24/7 betting (your core mechanic)
- ✅ No PDA storage per bet (75% cheaper)
- ✅ No events needed (track off-chain via transaction logs)
- ✅ No team selection in contract (handle in frontend)
- ✅ ~30 lines vs 200+ in complex version

#### 🚀 Ultra-Minimal Frontend: Single File Application

```typescript
// app/page.tsx - Entire app in one file
'use client'
import { useState, useEffect } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'

export default function MinimalSoltyBet() {
  const [phase, setPhase] = useState<'waiting' | 'betting' | 'fighting'>(
    'waiting',
  )
  const [match, setMatch] = useState<{ red: string; blue: string } | null>(null)
  const [redVolume, setRedVolume] = useState(0)
  const [blueVolume, setBlueVolume] = useState(0)

  const { connection } = useConnection()
  const { publicKey, sendTransaction } = useWallet()

  // WebSocket for real-time updates (or just polling)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/state')
        const data = await response.json()
        setPhase(data.phase)
        setMatch(data.match)
        setRedVolume(data.redVolume)
        setBlueVolume(data.blueVolume)
      } catch (error) {
        console.error('Failed to fetch state:', error)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const placeBet = async (team: 'red' | 'blue', amount: number) => {
    if (!publicKey) return

    try {
      // Your minimal smart contract call here
      const transaction = await createBetTransaction(amount)
      await sendTransaction(transaction, connection)

      // Optimistically update local state
      if (team === 'red') setRedVolume((prev) => prev + amount)
      else setBlueVolume((prev) => prev + amount)

      // Log bet for payout calculations
      await fetch('/api/bet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: publicKey.toString(),
          team,
          amount,
          matchId: match?.red + '_vs_' + match?.blue,
        }),
      })
    } catch (error) {
      console.error('Bet failed:', error)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-center">SoltyBet</h1>

        {/* Stream embed */}
        <div className="aspect-video bg-gray-800 rounded-lg">
          <iframe
            src="https://player.twitch.tv/?channel=saltybet&parent=localhost"
            className="w-full h-full rounded-lg"
          />
        </div>

        {/* Match info */}
        {match && (
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex justify-between items-center text-2xl">
              <span className="text-red-400">{match.red}</span>
              <span>VS</span>
              <span className="text-blue-400">{match.blue}</span>
            </div>
            <div className="flex justify-between mt-2">
              <span>Red: {redVolume.toFixed(2)} SOL</span>
              <span>Blue: {blueVolume.toFixed(2)} SOL</span>
            </div>
          </div>
        )}

        {/* Betting (only when allowed) */}
        {phase === 'betting' && (
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => placeBet('red', 0.1)}
              className="bg-red-600 hover:bg-red-700 p-6 rounded-lg text-xl font-bold"
              disabled={!publicKey}
            >
              Bet Red
              <br />
              0.1 SOL
            </button>
            <button
              onClick={() => placeBet('blue', 0.1)}
              className="bg-blue-600 hover:bg-blue-700 p-6 rounded-lg text-xl font-bold"
              disabled={!publicKey}
            >
              Bet Blue
              <br />
              0.1 SOL
            </button>
          </div>
        )}

        <div className="text-center">
          <WalletMultiButton />
        </div>
      </div>
    </div>
  )
}
```

#### 📡 Ultra-Minimal Backend: Two Endpoints

```typescript
// app/api/state/route.ts - Game state
export async function GET() {
  // Read from simple JSON file or single DB table
  const state = await getCurrentGameState()
  return Response.json(state)
}

// app/api/bet/route.ts - Log bets for payouts
export async function POST(request: Request) {
  const bet = await request.json()

  // Ultra-simple: append to JSON file
  const bets = await readBets()
  bets.push({ ...bet, timestamp: Date.now() })
  await writeBets(bets)

  return Response.json({ success: true })
}

// app/api/oracle/route.ts - Update game state (your oracle calls this)
export async function POST(request: Request) {
  const { phase, match } = await request.json()

  await updateGameState({ phase, match })

  // Call smart contract to open/close gate
  if (phase === 'betting') await openGate()
  if (phase === 'fighting') await closeGate()

  return Response.json({ success: true })
}
```

### 🎯 Bootstrap → Scale Migration Path

#### Level 1: JSON Files (0-100 users)

```typescript
// Store everything in files
const bets = JSON.parse(fs.readFileSync('./data/bets.json'))
const state = JSON.parse(fs.readFileSync('./data/state.json'))
```

#### Level 2: Single Database Table (100-1000 users)

```typescript
// Migrate to one table when files get slow
await supabase.from('events').insert({ type: 'bet', data: bet })
await supabase.from('events').insert({ type: 'state', data: state })
```

#### Level 3: Proper Schema (1000+ users)

```typescript
// Split into proper tables when you need complex queries
await supabase.from('bets').insert(bet)
await supabase.from('matches').insert(match)
```

### 💡 Why No Complex Smart Contract Needed

**You're completely right about the gate being essential.** Here's why your current approach is actually perfect:

1. **Gate = Your Entire Business Logic**

   - Without it: People bet 24/7 = no game
   - With it: Oracle controls betting windows = actual game

2. **Everything Else is Just Data Tracking**

   - Who bet what: Track off-chain
   - Volume calculations: Frontend math
   - Payouts: Your server sends SOL back

3. **Clockwork/Automation Not Needed**
   - You have a human oracle (your scraper)
   - It's more reliable than automated systems
   - You can adjust timing in real-time

### 🚀 Alternative: Even Simpler Contract

If you want to go even more minimal:

```rust
#[program]
pub mod gate_only {
    use super::*;

    pub fn set_gate(ctx: Context<SetGate>, is_open: bool) -> Result<()> {
        ctx.accounts.gate.is_open = is_open;
        Ok(())
    }

    pub fn check_gate(ctx: Context<CheckGate>) -> Result<()> {
        require!(ctx.accounts.gate.is_open, ErrorCode::BettingClosed);
        Ok(())
    }
}
```

Then handle transfers in your frontend:

```typescript
// Check gate first
await program.methods.checkGate().rpc()

// If gate is open, do direct SOL transfer
const transaction = new Transaction().add(
  SystemProgram.transfer({
    fromPubkey: publicKey,
    toPubkey: houseWallet,
    lamports: amount * LAMPORTS_PER_SOL,
  }),
)
```

### 🎯 Final Recommendation

**Your instinct is 100% correct:**

- Gate is essential (oracle control)
- Everything else should be minimal
- No complex PDA storage needed
- Direct SOL transfers are perfect

**Development Timeline:**

- Smart contract: 1 day
- Frontend: 2-3 days
- Backend: 1 day
- **Total: 1 week to live product**

The gate is your secret sauce. Everything else is just tracking data, which can be done off-chain much cheaper and simpler.

---

## 📱 Mobile-First Development Strategy

### 🎯 Current Focus: Frontend Excellence

**Priority 1: Modern, Responsive Frontend**

- ✅ Next.js 15 with mobile-first design
- ✅ Tailwind CSS with responsive breakpoints
- ✅ Touch-friendly UI components
- ✅ PWA capabilities for app-like experience
- ✅ Optimized for all screen sizes

**Priority 2: Data Integration**

- ✅ Connect to existing PostgreSQL via VPS API
- ✅ Preserve all fighter statistics and betting history
- ✅ Real-time updates for live betting
- ✅ Offline-ready data caching

**Priority 3: Mobile UX Enhancements**

- ✅ Swipe gestures for navigation
- ✅ Touch-optimized betting buttons
- ✅ Fast loading with skeleton screens
- ✅ Native app feel with smooth animations

### 🏗️ Implementation Phases

**Phase 1: Foundation (Current)**

```typescript
// Focus: Core mobile-responsive components
- Responsive layout system
- Mobile navigation
- Touch-friendly betting interface
- Basic fighter cards and match display
```

**Phase 2: Data Integration**

```typescript
// Focus: Connect to VPS PostgreSQL
- API client for VPS endpoints
- Real-time match data
- Fighter statistics display
- Betting history tracking
```

**Phase 3: Mobile Polish**

```typescript
// Focus: Native app experience
- PWA installation prompt
- Offline functionality
- Push notifications
- Advanced touch gestures
```

### 📊 Mobile Performance Targets

- ✅ **First Contentful Paint**: < 1.5s
- ✅ **Largest Contentful Paint**: < 2.5s
- ✅ **Time to Interactive**: < 3.5s
- ✅ **Cumulative Layout Shift**: < 0.1
- ✅ **Mobile PageSpeed Score**: > 90

### 🔄 Migration Benefits

**Immediate Wins:**

- Modern, fast frontend deployed globally
- Preserved fighter statistics and user data
- Cost reduction (67-90% vs current setup)
- Mobile-first user experience

**Long-term Value:**

- Easy to maintain and extend
- Ready for mobile app conversion
- Scalable architecture for growth
- Future-proof technology stack

This hybrid approach gives you the best of both worlds: a cutting-edge frontend with reliable, cost-effective backend infrastructure that preserves all your valuable data.
