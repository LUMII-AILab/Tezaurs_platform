#!/usr/bin/env bash

set -- $1
echo "manage.sh $#"
for arg; do echo $arg; done
cd "$(dirname "$0")" || exit

if [[ $# == 2 ]] && [[ "$1" = "deploy" ]] && [[ "$2" = "$(echo $2 | sed -e 's/[^[:alnum:]]//g')" ]]; then
  echo "# CI $(date)" >> .env \
  && echo "TAG=$2" >> .env \
  && TAG=$2 docker-compose up -d || exit $?
   docker-compose exec -T -e TAG=$2 -e DEBUG="*,-babel" viewer npm run test || exit $?
  echo "success"
  exit 0
else
  echo "invalid parameters, exiting"
  exit 1
fi
