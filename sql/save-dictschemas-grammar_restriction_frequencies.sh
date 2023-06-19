#!/bin/sh

DB=dictschemas
SCHEMA=dict
TABLE=grammar_restriction_frequencies

pg_dump -n $SCHEMA -t $SCHEMA.$TABLE -a --column-inserts $DB >$DB-$SCHEMA-$TABLE-$(date "+%y%m%d-%H%M").pgsql
