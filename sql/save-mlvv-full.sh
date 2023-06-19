#!/bin/sh

DB=mlvv
SCHEMA=dict

pg_dump -n $SCHEMA $DB >$DB-$SCHEMA-full-$(date "+%y%m%d-%H%M").pgsql
