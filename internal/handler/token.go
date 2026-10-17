package handler

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"strconv"
	"time"

	"github.com/FruitsAI/Orange/internal/middleware"
	"github.com/FruitsAI/Orange/internal/models"
	"github.com/FruitsAI/Orange/internal/pkg/response"
	"github.com/FruitsAI/Orange/internal/repository"
	"github.com/gin-gonic/gin"
)

type TokenHandler struct {
	repo *repository.TokenRepository
}

func NewTokenHandler() *TokenHandler {
	return &TokenHandler{repo: repository.NewTokenRepository()}
}

// CreateRequest 创建令牌请求参数
type CreateTokenRequest struct {
	Name      string `json:"name" binding:"required"`
	ExpiresIn int    `json:"expires_in"` // 过期时间 (天)，0 表示永不过期
}

// CreateResponse 创建令牌响应 (包含原始 Token)
type CreateTokenResponse struct {
	Token string                      `json:"token"`
	Data  *models.PersonalAccessToken `json:"data"`
}

// generateToken 生成随机 Token 字符串 (32字节 hex)
func generateToken() (string, error) {
	bytes := make([]byte, 32) // 32 bytes = 64 hex chars
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	// 添加前缀以便识别
	return "pat_" + hex.EncodeToString(bytes), nil
}

func parseTokenID(c *gin.Context) (int64, bool) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		response.ParamError(c, "Invalid token id")
		return 0, false
	}
	return id, true
}

// hashToken 计算 Token Hash
func hashToken(token string) string {
	hash := sha256.Sum256([]byte(token))
	return hex.EncodeToString(hash[:])
}

// Create 创建新的访问令牌
func (h *TokenHandler) Create(c *gin.Context) {
	var req CreateTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ParamError(c, "Invalid parameters")
		return
	}

	userID := middleware.GetUserID(c)

	// 1. 生成原始 Token
	rawToken, err := generateToken()
	if err != nil {
		response.InternalError(c, "Failed to generate token")
		return
	}

	// 2. 计算 Hash
	tokenHash := hashToken(rawToken)

	// 3. 计算过期时间
	var expiresAt *time.Time
	if req.ExpiresIn > 0 {
		t := time.Now().AddDate(0, 0, req.ExpiresIn)
		expiresAt = &t
	}

	// 4. 构建模型
	token := &models.PersonalAccessToken{
		UserID:    userID,
		Name:      req.Name,
		TokenHash: tokenHash,
		Status:    1,
		ExpiresAt: expiresAt,
	}

	// 5. 保存到数据库
	if err := h.repo.Create(token); err != nil {
		response.InternalError(c, "Failed to save token")
		return
	}

	// 6. 返回结果 (包含原始 Token，仅此一次)
	response.Success(c, CreateTokenResponse{
		Token: rawToken,
		Data:  token,
	})
}

// List 获取令牌列表
func (h *TokenHandler) List(c *gin.Context) {
	userID := middleware.GetUserID(c)
	tokens, err := h.repo.List(userID)
	if err != nil {
		response.InternalError(c, "Failed to list tokens")
		return
	}

	response.Success(c, tokens)
}

// Revoke 撤销令牌
func (h *TokenHandler) Revoke(c *gin.Context) {
	id, ok := parseTokenID(c)
	if !ok {
		return
	}

	userID := middleware.GetUserID(c)

	if err := h.repo.Revoke(id, userID); err != nil {
		response.InternalError(c, "Failed to revoke token")
		return
	}

	response.SuccessWithMessage(c, "success", nil)
}

// Delete 删除令牌
func (h *TokenHandler) Delete(c *gin.Context) {
	id, ok := parseTokenID(c)
	if !ok {
		return
	}

	userID := middleware.GetUserID(c)

	if err := h.repo.Delete(id, userID); err != nil {
		response.InternalError(c, "Failed to delete token")
		return
	}

	response.SuccessWithMessage(c, "success", nil)
}
