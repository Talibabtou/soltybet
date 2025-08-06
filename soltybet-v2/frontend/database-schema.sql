-- SoltyBet v2 Database Schema
-- Designed for efficiency and blockchain integration

-- Game phases enum for type safety
CREATE TYPE game_phase AS ENUM ('waiting', 'betting', 'locked', 'fighting', 'finished');
CREATE TYPE bet_team AS ENUM ('red', 'blue');
CREATE TYPE fighter_tier AS ENUM ('S', 'A', 'B', 'C', 'D');

-- Users table with standard id and blockchain integration
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT UNIQUE NOT NULL CHECK (length(wallet_address) BETWEEN 32 AND 44),
    referral_code TEXT UNIQUE CHECK (length(referral_code) <= 20),
    referred_by UUID REFERENCES users(id),
    total_volume DECIMAL(12,4) DEFAULT 0 CHECK (total_volume >= 0),
    total_payout DECIMAL(12,4) DEFAULT 0 CHECK (total_payout >= 0),
    total_gain DECIMAL(12,4) DEFAULT 0 CHECK (total_gain >= 0),
    referral_gain DECIMAL(12,4) DEFAULT 0 CHECK (referral_gain >= 0),
    bet_count INTEGER DEFAULT 0 CHECK (bet_count >= 0),
    country_code CHAR(2) DEFAULT 'ZZ',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fighters table with comprehensive stats
CREATE TABLE fighters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    fight_count INTEGER DEFAULT 0 CHECK (fight_count >= 0),
    wins INTEGER DEFAULT 0 CHECK (wins >= 0),
    losses INTEGER DEFAULT 0 CHECK (losses >= 0),
    elo INTEGER DEFAULT 1000 CHECK (elo >= 0),
    tier fighter_tier DEFAULT 'C',
    is_active BOOLEAN DEFAULT true,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Computed constraints
    CONSTRAINT wins_losses_match_fights CHECK (wins + losses <= fight_count)
);

-- Matches table with descriptive foreign keys
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    red_fighter_id UUID NOT NULL REFERENCES fighters(id),
    blue_fighter_id UUID NOT NULL REFERENCES fighters(id),
    winner_id UUID REFERENCES fighters(id),
    phase game_phase DEFAULT 'waiting',
    volume_red DECIMAL(12,4) DEFAULT 0 CHECK (volume_red >= 0),
    volume_blue DECIMAL(12,4) DEFAULT 0 CHECK (volume_blue >= 0),
    bet_count INTEGER DEFAULT 0 CHECK (bet_count >= 0),
    started_at TIMESTAMP WITH TIME ZONE,
    finished_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Business logic constraints
    CONSTRAINT different_fighters CHECK (red_fighter_id != blue_fighter_id),
    CONSTRAINT winner_is_participant CHECK (
        winner_id IS NULL OR 
        winner_id = red_fighter_id OR 
        winner_id = blue_fighter_id
    )
);

-- Bets table with blockchain transaction tracking
CREATE TABLE bets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    match_id UUID NOT NULL REFERENCES matches(id),
    fighter_id UUID NOT NULL REFERENCES fighters(id),
    team bet_team NOT NULL,
    volume DECIMAL(12,4) NOT NULL CHECK (volume > 0),
    payout DECIMAL(12,4) DEFAULT 0 CHECK (payout >= 0),
    
    -- Blockchain integration fields
    tx_signature TEXT UNIQUE,
    block_hash TEXT,
    slot_number BIGINT,
    confirmed BOOLEAN DEFAULT false,
    failed BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Business logic constraints
    CONSTRAINT fighter_matches_team CHECK (
        (team = 'red' AND fighter_id IN (SELECT red_fighter_id FROM matches WHERE id = match_id)) OR
        (team = 'blue' AND fighter_id IN (SELECT blue_fighter_id FROM matches WHERE id = match_id))
    )
);

-- Indexes for performance
CREATE INDEX idx_users_wallet_address ON users(wallet_address);
CREATE INDEX idx_users_referral_code ON users(referral_code) WHERE referral_code IS NOT NULL;
CREATE INDEX idx_fighters_name ON fighters(name);
CREATE INDEX idx_fighters_elo ON fighters(elo DESC);
CREATE INDEX idx_fighters_active ON fighters(is_active) WHERE is_active = true;
CREATE INDEX idx_matches_phase ON matches(phase);
CREATE INDEX idx_matches_created_at ON matches(created_at DESC);
CREATE INDEX idx_matches_fighters ON matches(red_fighter_id, blue_fighter_id);
CREATE INDEX idx_bets_user_id ON bets(user_id);
CREATE INDEX idx_bets_match_id ON bets(match_id);
CREATE INDEX idx_bets_tx_signature ON bets(tx_signature) WHERE tx_signature IS NOT NULL;
CREATE INDEX idx_bets_confirmed ON bets(confirmed);

-- Update triggers for automatic timestamp management
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fighters_updated_at BEFORE UPDATE ON fighters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();