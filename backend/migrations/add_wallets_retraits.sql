-- Système de paiement / retrait chauffeur (wallet, retraits, historique)
-- Exécuter après database_setup.sql

-- Table wallets (un enregistrement par chauffeur)
CREATE TABLE IF NOT EXISTS driver_wallets (
  chauffeur_id UUID PRIMARY KEY REFERENCES drivers(id) ON DELETE CASCADE,
  balance DECIMAL(12,2) DEFAULT 0 NOT NULL,
  balance_en_attente DECIMAL(12,2) DEFAULT 0 NOT NULL,
  total_gagne DECIMAL(12,2) DEFAULT 0 NOT NULL,
  total_retire DECIMAL(12,2) DEFAULT 0 NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table retraits (demandes de retrait)
CREATE TABLE IF NOT EXISTS retraits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chauffeur_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES admins(id),
  montant DECIMAL(12,2) NOT NULL,
  methode VARCHAR(20) NOT NULL,
  numero_compte VARCHAR(50),
  statut VARCHAR(20) NOT NULL DEFAULT 'en_attente',
  type_retrait VARCHAR(30),
  date_demande TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  date_traitement TIMESTAMP WITH TIME ZONE,
  traite_par UUID,
  CONSTRAINT retraits_statut_check CHECK (statut IN ('en_attente', 'traite', 'annule')),
  CONSTRAINT retraits_methode_check CHECK (methode IN ('moncash', 'natcash', 'bank'))
);

CREATE INDEX IF NOT EXISTS idx_retraits_chauffeur ON retraits(chauffeur_id);
CREATE INDEX IF NOT EXISTS idx_retraits_statut ON retraits(statut);
CREATE INDEX IF NOT EXISTS idx_retraits_date_demande ON retraits(date_demande DESC);

-- Table historique des transactions wallet (courses créditées, retraits traités/annulés)
CREATE TABLE IF NOT EXISTS driver_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chauffeur_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  ride_id UUID REFERENCES rides(id),
  retrait_id UUID REFERENCES retraits(id),
  type_txn VARCHAR(40) NOT NULL,
  montant DECIMAL(12,2) NOT NULL,
  montant_total DECIMAL(12,2),
  commission_taptapgo DECIMAL(12,2),
  gain_chauffeur DECIMAL(12,2),
  methode VARCHAR(20),
  reference VARCHAR(100),
  statut VARCHAR(20) DEFAULT 'ok',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_driver_transactions_chauffeur ON driver_transactions(chauffeur_id);
CREATE INDEX IF NOT EXISTS idx_driver_transactions_created ON driver_transactions(created_at DESC);

-- Synchroniser driver_wallets avec wallet_balance existant des drivers (optionnel, à exécuter une fois)
-- INSERT INTO driver_wallets (chauffeur_id, balance, total_gagne)
-- SELECT id, COALESCE(wallet_balance, 0), COALESCE(wallet_balance, 0) FROM drivers
-- ON CONFLICT (chauffeur_id) DO NOTHING;
