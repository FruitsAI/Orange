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

func TestValidateProductionDatabasePolicyRejectsServerSQLite(t *testing.T) {
	cfg := &Config{RuntimeMode: "server", DBType: "sqlite"}

	err := validateProductionDatabasePolicy(cfg, "production", false)
	if err == nil {
		t.Fatal("expected production server sqlite policy error")
	}
}

func TestValidateProductionDatabasePolicyAllowsDesktopSQLite(t *testing.T) {
	cfg := &Config{RuntimeMode: "desktop", DBType: "sqlite"}

	if err := validateProductionDatabasePolicy(cfg, "production", false); err != nil {
		t.Fatalf("unexpected desktop sqlite policy error: %v", err)
	}
}

func TestValidateProductionDatabasePolicyAllowsExplicitSQLiteOverride(t *testing.T) {
	cfg := &Config{RuntimeMode: "server", DBType: "sqlite"}

	if err := validateProductionDatabasePolicy(cfg, "production", true); err != nil {
		t.Fatalf("unexpected override policy error: %v", err)
	}
}
