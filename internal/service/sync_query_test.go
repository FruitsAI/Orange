package service

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestBuildUpsertQueryRejectsUnknownTable(t *testing.T) {
	service := NewSyncService()

	_, err := service.buildUpsertQuery("users; DROP TABLE users", "postgres")

	require.Error(t, err)
}

func TestBuildUpsertQueryUsesFixedTableDefinition(t *testing.T) {
	service := NewSyncService()

	query, err := service.buildUpsertQuery("users", "postgres")

	require.NoError(t, err)
	require.Contains(t, query, `INSERT INTO "users"`)
	require.Contains(t, query, `"username" = EXCLUDED."username"`)
	require.NotContains(t, strings.ToLower(query), "drop table")
}
