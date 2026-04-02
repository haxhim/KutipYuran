#!/bin/sh
set -eu

npx prisma db execute --file prisma/bootstrap.sql --schema prisma/schema.prisma
exec node dist/worker/worker/index.js
