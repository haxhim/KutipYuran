#!/bin/sh
set -eu

npx prisma migrate deploy
exec node dist/worker/worker/index.js
