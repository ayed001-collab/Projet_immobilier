-- Initialisation PostGIS (chemin production — optionnel pour l'Incrément 0).
-- L'API lit par défaut le GeoJSON de service ; PostGIS est branché via
-- DATABASE_URL quand on veut le stockage relationnel/géo (voir docs/10 & docs/12).

CREATE EXTENSION IF NOT EXISTS postgis;

-- Référentiel géographique minimal (préfigure la table ZONE, docs/10).
CREATE TABLE IF NOT EXISTS zone (
  zone_id       BIGSERIAL PRIMARY KEY,
  code_insee    TEXT UNIQUE NOT NULL,
  level         TEXT NOT NULL DEFAULT 'commune',
  name          TEXT NOT NULL,
  geometry      geometry(MultiPolygon, 4326),
  valid_from    DATE,
  valid_to      DATE
);
CREATE INDEX IF NOT EXISTS zone_geom_gix ON zone USING GIST (geometry);

-- Indicateur prix au m² par commune (historisable — append-only en V+).
CREATE TABLE IF NOT EXISTS indicator_commune_prix (
  code_commune      TEXT NOT NULL,
  nom_commune       TEXT,
  prix_m2           DOUBLE PRECISION,
  obs_count         INTEGER,
  periode           TEXT,
  confidence_score  INTEGER,
  confidence_level  TEXT,
  source            TEXT,
  millesime         TEXT,
  derniere_maj      TIMESTAMPTZ,
  is_estimated      BOOLEAN DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_indic_commune ON indicator_commune_prix (code_commune);
