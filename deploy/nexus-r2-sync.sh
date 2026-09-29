#!/bin/bash
# Mirror Nexus Dashboard backups off-site to Cloudflare R2.
#
# Runs on the host, not inside the app container, so the R2 credentials in
# /root/.config/rclone/rclone.conf are never exposed to the web app.
#
# Two things are shipped: the SQLite snapshots from scripts/backup.mjs, and the
# uploads/ directory. Uploads matter because the links table stores an `icon`
# column pointing at those files, so a database restored without them comes
# back with broken images.
set -euo pipefail

DATA_DIR="${NEXUS_DATA_DIR:-/var/lib/docker/volumes/nexus-data/_data}"
REMOTE="${NEXUS_R2_REMOTE:-R2:nexus-backups}"
KEEP="${NEXUS_R2_KEEP:-7}"

log() { logger -t nexus-backup -- "$*"; echo "[nexus-backup] $*"; }

if [ ! -d "$DATA_DIR/backups" ]; then
  log "ERROR: no snapshot directory at $DATA_DIR/backups — local backup step failed?"
  exit 1
fi

# `copy`, never `sync`: if the local run produced nothing, a sync would happily
# empty the bucket and destroy every offsite backup we have.
log "uploading snapshots to $REMOTE"
rclone copy "$DATA_DIR/backups" "$REMOTE/backups" \
  --include '*.sqlite' \
  --exclude '*-shm' \
  --exclude '*-wal' \
  --transfers 2 \
  --stats-one-line

if [ -d "$DATA_DIR/uploads" ]; then
  log "uploading uploads"
  rclone copy "$DATA_DIR/uploads" "$REMOTE/uploads" --transfers 2 --stats-one-line
else
  log "no uploads directory yet, skipping"
fi

# Prune to the newest $KEEP snapshots. Ordered by modified, drop everything
# past the first $KEEP.
log "pruning to newest $KEEP snapshots in R2"
rclone lsf "$REMOTE/backups" --files-only 2>/dev/null \
  | while read -r f; do
      printf '%s\t%s\n' "$(rclone lsjson "$REMOTE/backups/$f" --stat | python3 -c 'import json,sys; print(json.load(sys.stdin)["ModTime"])' 2>/dev/null || echo 0)" "$f"
    done \
  | sort -rn | tail -n "+$((KEEP + 1))" | cut -f2 \
  | while read -r old; do
      [ -n "$old" ] && log "  removing $old" && rclone deletefile "$REMOTE/backups/$old"
    done

COUNT=$(rclone lsf "$REMOTE/backups" --files-only 2>/dev/null | wc -l)
log "R2 sync complete, $COUNT snapshot(s) retained"
