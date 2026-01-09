package handler

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/FruitsAI/Orange/internal/config"
	"github.com/gin-gonic/gin"
)

type SystemHandler struct{}

func NewSystemHandler() *SystemHandler {
	return &SystemHandler{}
}

// CheckUpdateResponse defines the response structure for update checks
type CheckUpdateResponse struct {
	TagName string `json:"tag_name"`
	HtmlUrl string `json:"html_url"`
	Body    string `json:"body"`
}

// CheckUpdate fetches the latest release from GitHub
func (h *SystemHandler) CheckUpdate(c *gin.Context) {
	repo := config.AppConfig.GitHubRepo
	if repo == "" {
		repo = "FruitsAI/Orange" // Fallback
	}
	url := fmt.Sprintf("https://api.github.com/repos/%s/releases/latest", repo)

	resp, err := http.Get(url)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch update info"})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		c.JSON(resp.StatusCode, gin.H{"error": "Failed to fetch update info from GitHub"})
		return
	}

	var releaseInfo CheckUpdateResponse
	if err := json.NewDecoder(resp.Body).Decode(&releaseInfo); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse GitHub response"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "success",
		"data":    releaseInfo,
	})
}
