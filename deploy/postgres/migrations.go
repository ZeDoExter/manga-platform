// Package postgres embeds SQL migrations for go:embed pickup by services.
package postgres

import "embed"

// Migrations holds deploy/postgres/migrations/*.up.sql, applied in name order
// by pkg/pgmigrate at service startup.
//
//go:embed migrations/*.up.sql
var Migrations embed.FS

// Dir is the embedded path passed to pgmigrate.Up.
const Dir = "migrations"
