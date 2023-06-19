ALTER TABLE IF EXISTS dict.wordnet_entries
    ADD COLUMN in_top boolean DEFAULT true;

ALTER TABLE IF EXISTS dict.wordnet_entries
    ALTER COLUMN no DROP NOT NULL;