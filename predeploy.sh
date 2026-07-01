#!/bin/sh
# Render preDeployCommand target. Runs once per deploy (see render.yaml).
# Kept as a script so the command chain doesn't depend on Render's argv parsing.
set -e

alembic upgrade head
python seed.py --demo
