#!/bin/sh

DB=tezaurs
SCHEMA=dict

echo "loading wordnet entries"
psql $DB <tables/wordnet-list.pgsql
