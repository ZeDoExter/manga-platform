package pgmigrate

import (
	"context"
	"embed"
	"log"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Boot selects memory or PG store with migrations.
// Replaces identical newService boilerplate in 6 cmd mains.
func Boot[S any](ctx context.Context, name string, files embed.FS, dir string, memory func() S, pg func(*pgxpool.Pool) S) S {
	if os.Getenv("DATABASE_URL") == "" {
		log.Printf("%s: DATABASE_URL unset, using in-memory store", name)
		return memory()
	}
	pool := MustConnect(ctx)
	if err := Up(ctx, pool, files, dir); err != nil {
		log.Fatalf("%s: migrate: %v", name, err)
	}
	return pg(pool)
}
