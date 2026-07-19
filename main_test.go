package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
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

func TestCreateAssetHandlerFallsBackToIndexForSPARoutes(t *testing.T) {
	api := http.NewServeMux()
	handler := createAssetHandler(api)

	req := httptest.NewRequest(http.MethodGet, "/dashboard", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	require.Equal(t, http.StatusOK, rec.Code)
	require.Contains(t, rec.Header().Get("Content-Type"), "text/html")
	require.True(t, strings.Contains(rec.Body.String(), `<div id="app">`))
}

func TestCreateAssetHandlerRoutesAPIRequestsToBackend(t *testing.T) {
	api := http.NewServeMux()
	api.HandleFunc("/api/health", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusTeapot)
	})
	handler := createAssetHandler(api)

	req := httptest.NewRequest(http.MethodGet, "/api/health", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	require.Equal(t, http.StatusTeapot, rec.Code)
}
