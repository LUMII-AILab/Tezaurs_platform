#!/bin/sh

DB=tezaurs
SCHEMA=dict

echo "dropping old schema $SCHEMA"
psql -c "drop schema $SCHEMA cascade;" $DB
echo "loading new schema"
psql $DB <schemas/dictschemas-dict-full.pgsql
echo "loading users"
psql $DB <tables/dictschemas-dict-users.pgsql
# echo "renaming schema to tezaurs"
# psql -c "alter schema dict rename to tezaurs;" tezdev
echo "loading sources"
psql $DB <tables/tezaurs-sources.pgsql
echo "loading feedback"
psql $DB <tables/feedback.pgsql
