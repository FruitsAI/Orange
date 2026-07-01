package main

import (
	"net/http"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestNewExternalAPIServerSetsTimeouts(t *testing.T) {
	server := newExternalAPIServer("127.0.0.1:3456", http.NewServeMux())

	require.GreaterOrEqual(t, server.ReadHeaderTimeout, 5*time.Second)
	require.GreaterOrEqual(t, server.ReadTimeout, 10*time.Second)
	require.GreaterOrEqual(t, server.WriteTimeout, 10*time.Second)
	require.GreaterOrEqual(t, server.IdleTimeout, 30*time.Second)
}
