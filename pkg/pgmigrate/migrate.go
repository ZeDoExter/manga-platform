// Package pgmigrate runs embedded SQL migrations with advisory locking,
// so N pods starting at once migrate exactly once.
package pgmigrate

import (
	"bytes"
	"context"
	"crypto/sha256"
	"embed"
	"encoding/hex"
	"fmt"
	"io/fs"
	"log"
	"os"
	"sort"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// legacyChecksum hashes raw bytes (pre-normalization) for DBs migrated
// before CRLF normalization landed.
func legacyChecksum(raw []byte) string {
	sum := sha256.Sum256(raw)
	return hex.EncodeToString(sum[:])
}

// lockKey must be unique per database. Any stable int64 works.
const lockKey int64 = 20261107

// Up applies all pending *.up.sql files from dir (embedded FS path) in order.
// Each file runs in its own transaction. Safe for concurrent callers.
func Up(ctx context.Context, pool *pgxpool.Pool, files embed.FS, dir string) error {
	conn, err := pool.Acquire(ctx)
	if err != nil {
		return fmt.Errorf("migrate: acquire: %w", err)
	}
	defer conn.Release()

	if _, err := conn.Exec(ctx, `SELECT pg_advisory_lock($1)`, lockKey); err != nil {
		return fmt.Errorf("migrate: lock: %w", err)
	}
	defer conn.Exec(context.Background(), `SELECT pg_advisory_unlock($1)`, lockKey)

	if _, err := conn.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version    TEXT NOT NULL PRIMARY KEY,
			checksum   TEXT NOT NULL,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
		)`); err != nil {
		return fmt.Errorf("migrate: bootstrap: %w", err)
	}

	applied := map[string]string{}
	rows, err := conn.Query(ctx, `SELECT version, checksum FROM schema_migrations`)
	if err != nil {
		return fmt.Errorf("migrate: read applied: %w", err)
	}
	for rows.Next() {
		var v, c string
		if err := rows.Scan(&v, &c); err != nil {
			rows.Close()
			return fmt.Errorf("migrate: scan applied: %w", err)
		}
		applied[v] = c
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return fmt.Errorf("migrate: rows: %w", err)
	}

	entries, err := fs.ReadDir(files, dir)
	if err != nil {
		return fmt.Errorf("migrate: read dir: %w", err)
	}
	names := []string{}
	for _, e := range entries {
		if !e.IsDir() && strings.HasSuffix(e.Name(), ".up.sql") {
			names = append(names, e.Name())
		}
	}
	sort.Strings(names)

	for _, name := range names {
		raw, err := fs.ReadFile(files, dir+"/"+name)
		if err != nil {
			return fmt.Errorf("migrate: read %s: %w", name, err)
		}
		// Normalize CRLF so Windows checkouts hash the same as LF ones.
		normalized := bytes.ReplaceAll(raw, []byte("\r\n"), []byte("\n"))
		sum := sha256.Sum256(normalized)
		checksum := hex.EncodeToString(sum[:])

		if prev, ok := applied[name]; ok {
			if prev != checksum && prev != legacyChecksum(raw) {
				return fmt.Errorf("migrate: %s was modified after apply (checksum mismatch) — add a new file instead", name)
			}
			continue
		}


		start := time.Now()
		tx, err := conn.Begin(ctx)
		if err != nil {
			return fmt.Errorf("migrate: begin %s: %w", name, err)
		}
		if _, err := tx.Exec(ctx, string(raw)); err != nil {
			_ = tx.Rollback(ctx)
			return fmt.Errorf("migrate: apply %s: %w", name, err)
		}
		if _, err := tx.Exec(ctx,
			`INSERT INTO schema_migrations (version, checksum) VALUES ($1, $2)`,
			name, checksum); err != nil {
			_ = tx.Rollback(ctx)
			return fmt.Errorf("migrate: record %s: %w", name, err)
		}
		if err := tx.Commit(ctx); err != nil {
			return fmt.Errorf("migrate: commit %s: %w", name, err)
		}
		log.Printf("migrate: applied %s in %s", name, time.Since(start).Round(time.Millisecond))
	}
	return nil
}

// MustConnect opens a pool from DATABASE_URL and pings it.
func MustConnect(ctx context.Context) *pgxpool.Pool {
	url := strings.TrimSpace(os.Getenv("DATABASE_URL"))
	if url == "" {
		log.Fatal("pg: DATABASE_URL is required")
	}
	pool, err := pgxpool.New(ctx, url)
	if err != nil {
		log.Fatalf("pg: connect: %v", err)
	}
	if err := pool.Ping(ctx); err != nil {
		log.Fatalf("pg: ping: %v", err)
	}
	return pool
}
