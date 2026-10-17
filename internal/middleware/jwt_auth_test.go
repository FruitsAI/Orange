package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/FruitsAI/Orange/internal/config"
	"github.com/FruitsAI/Orange/internal/database"
	"github.com/FruitsAI/Orange/internal/models"
	"github.com/FruitsAI/Orange/internal/pkg/jwt"
	"github.com/FruitsAI/Orange/internal/pkg/password"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func setupJWTAuthTestDB(t *testing.T) {
	t.Helper()

	config.AppConfig = &config.Config{
		DBType: "sqlite",
		DBPath: "file:jwt_auth_test?mode=memory&cache=shared",
	}
	db := database.GetDB()
	require.NoError(t, db.AutoMigrate(&models.User{}, &models.PersonalAccessToken{}))
}

func TestJWTAuthRejectsDisabledUser(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupJWTAuthTestDB(t)

	hash, err := password.HashPassword("Passw0rd")
	require.NoError(t, err)

	db := database.GetDB()
	user := models.User{
		Username: "disabled-user",
		Name:     "Disabled User",
		Password: hash,
		Role:     "user",
		Status:   0,
	}
	require.NoError(t, db.Create(&user).Error)
	require.NoError(t, db.Model(&models.User{}).Where("id = ?", user.ID).Update("status", 0).Error)

	jwt.SecretKey = []byte("test-secret-key-for-jwt-auth-only")
	jwt.TokenExpiry = time.Hour
	token, err := jwt.GenerateToken(user.ID, user.Username, user.Role)
	require.NoError(t, err)

	router := gin.New()
	router.GET("/protected", JWTAuth(), func(c *gin.Context) {
		c.Status(http.StatusNoContent)
	})

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	require.NotEqual(t, http.StatusNoContent, rec.Code)
}
