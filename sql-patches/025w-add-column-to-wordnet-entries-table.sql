ALTER TABLE IF EXISTS dict.wordnet_entries
    ADD COLUMN visible_examples_done boolean DEFAULT false;
