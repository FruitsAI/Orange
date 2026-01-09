package main

import (
	"embed"
	_ "embed"
	"io/fs"
	"log"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/FruitsAI/Orange/internal/config"
	"github.com/FruitsAI/Orange/internal/database"
	"github.com/FruitsAI/Orange/internal/models"
	"github.com/FruitsAI/Orange/internal/pkg/jwt"
	"github.com/FruitsAI/Orange/internal/router"
	"github.com/wailsapp/wails/v3/pkg/application"
)

// Wails uses Go's `embed` package to embed the frontend files into the binary.
// Any files in the frontend/dist folder will be embedded into the binary and
// made available to the frontend.
// See https://pkg.go.dev/embed for more information.

//go:embed all:frontend/dist
var assets embed.FS

func init() {
}

// createAssetHandler creates a combined handler that:
// 1. Routes /api/* requests to Gin router
// 2. Serves static assets from embedded FS
func createAssetHandler() http.Handler {
	// Create Gin router for API endpoints
	ginRouter := router.NewRouter()

	// Get the embedded frontend assets
	frontendFS, err := fs.Sub(assets, "frontend/dist")
	if err != nil {
		log.Fatal("Failed to create sub filesystem:", err)
	}
	staticHandler := http.FileServer(http.FS(frontendFS))

	// Return a combined handler
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Route API requests to Gin
		if strings.HasPrefix(r.URL.Path, "/api") {
			ginRouter.ServeHTTP(w, r)
			return
		}
		// Serve static assets for everything else
		staticHandler.ServeHTTP(w, r)
	})
}

// main function serves as the application's entry point. It initializes the application, creates a window,
// and starts a goroutine that emits a time-based event every second. It subsequently runs the application and
// logs any error that might occur.
func main() {
	// Load configuration
	config.Load()

	// Initialize JWT Secret
	jwt.SecretKey = []byte(config.AppConfig.JWTSecret)
	jwt.TokenExpiry = time.Duration(config.AppConfig.TokenExpiry) * time.Hour

	// Initialize database
	slog.Info("Initializing database...")
	db := database.GetDB()
	// Auto Migrate
	db.AutoMigrate(
		&models.User{},
		&models.Project{},
		&models.Payment{},
		&models.Dictionary{},
		&models.DictionaryItem{},
		&models.Notification{},
		&models.UserNotification{},
	)

	// Seed Initial Data
	if err := database.Seed(db); err != nil {
		slog.Error("Failed to seed database", "error", err)
	}

	defer database.Close()

	// Create combined asset handler
	assetHandler := createAssetHandler()

	// Create a new Wails application by providing the necessary options.
	// Variables 'Name' and 'Description' are for application metadata.
	// 'Assets' configures the asset server with the 'FS' variable pointing to the frontend files.
	// 'Bind' is a list of Go struct instances. The frontend has access to the methods of these instances.
	// 'Mac' options tailor the application when running an macOS.
	app := application.New(application.Options{
		Name:        "Orange",
		Description: "FruitsAI Orange Desktop App",
		Assets: application.AssetOptions{
			Handler: assetHandler,
		},
		Mac: application.MacOptions{
			ApplicationShouldTerminateAfterLastWindowClosed: true,
		},
	})

	// Create a new window with the necessary options.
	// 'Title' is the title of the window.
	// 'Mac' options tailor the window when running on macOS.
	// 'BackgroundColour' is the background colour of the window.
	// 'URL' is the URL that will be loaded into the webview.
	app.Window.NewWithOptions(application.WebviewWindowOptions{
		Title:  "Orange",
		Width:  1280,
		Height: 800,
		Mac: application.MacWindow{
			InvisibleTitleBarHeight: 50,
			Backdrop:                application.MacBackdropTranslucent,
			TitleBar:                application.MacTitleBarHiddenInset,
		},
		BackgroundColour: application.NewRGB(27, 38, 54),
		URL:              "/",
	})

	// Run the application. This blocks until the application has been exited.
	err := app.Run()

	// If an error occurred while running the application, log it and exit.
	if err != nil {
		log.Fatal(err)
	}
}
