package config

import (
	"slices"
	"testing"
)

func TestLoadIncludesWebDeploymentURLs(t *testing.T) {
	t.Setenv("JWT_SECRET", "orange-dev-secret-32-characters-long")
	t.Setenv("FRONTEND_URL", "https://orange.example.com")
	t.Setenv("API_BASE_URL", "https://api.orange.example.com")
	t.Setenv("ALLOWED_ORIGINS", "")

	Load()

	if AppConfig.FrontendURL != "https://orange.example.com" {
		t.Fatalf("FrontendURL = %q", AppConfig.FrontendURL)
	}
	if AppConfig.APIBaseURL != "https://api.orange.example.com" {
		t.Fatalf("APIBaseURL = %q", AppConfig.APIBaseURL)
	}
	if !slices.Contains(AppConfig.AllowedOrigins, "https://orange.example.com") {
		t.Fatalf("AllowedOrigins = %#v, want frontend URL included", AppConfig.AllowedOrigins)
	}
}
