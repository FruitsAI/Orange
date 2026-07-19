package handler

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/FruitsAI/Orange/internal/pkg/response"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestGenerateTokenUses256BitEntropy(t *testing.T) {
	token, err := generateToken()

	require.NoError(t, err)
	require.Len(t, token, len("pat_")+64)
}

func TestTokenHandlerRejectsInvalidRevokeID(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	handler := &TokenHandler{}
	router.POST("/tokens/:id/revoke", handler.Revoke)

	req := httptest.NewRequest(http.MethodPost, "/tokens/not-a-number/revoke", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	var resp response.Response
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &resp))
	require.Equal(t, response.CodeParamError, resp.Code)
}
