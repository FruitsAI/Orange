package router

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/FruitsAI/Orange/internal/config"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestCSPRejectsUnsafeEvalOutsideDebugMode(t *testing.T) {
	gin.SetMode(gin.TestMode)
	config.AppConfig = &config.Config{
		AllowedOrigins: []string{"http://localhost:5173"},
	}

	router := gin.New()
	router.Use(corsMiddleware())
	router.GET("/api/health", healthCheck)

	req := httptest.NewRequest(http.MethodGet, "/api/health", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	csp := rec.Header().Get("Content-Security-Policy")
	require.NotEmpty(t, csp)
	require.False(t, strings.Contains(csp, "unsafe-eval"))
}

func TestRegisterRouteIsNotMounted(t *testing.T) {
	gin.SetMode(gin.TestMode)
	config.AppConfig = &config.Config{
		AllowedOrigins: []string{"http://localhost:5173"},
	}

	router := NewRouter()

	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	require.Equal(t, http.StatusNotFound, rec.Code)
}
