#!/bin/sh

DB=mlvv
SCHEMA=dict

echo "dropping old schema $SCHEMA"
psql -c "drop schema $SCHEMA cascade;" $DB
echo "loading new schema"
psql $DB <schemas/dictschemas-dict-full.pgsql
echo "loading users"
psql $DB <tables/dictschemas-dict-users.pgsql
# echo "renaming schema to mlvv"
# psql -c "alter schema dict rename to mlvv;" mlvv
