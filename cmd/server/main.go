package main

import (
	"context"
	"errors"
	"log"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/FruitsAI/Orange/internal/app"
	"github.com/FruitsAI/Orange/internal/config"
)

func main() {
	runtime, cleanup, err := app.Bootstrap(app.RuntimeModeServer)
	if err != nil {
		log.Fatal(err)
	}
	defer cleanup()

	host := os.Getenv("API_SERVER_HOST")
	if host == "" {
		host = "0.0.0.0"
	}

	addr := net.JoinHostPort(host, strconv.Itoa(config.AppConfig.APIServerPort))
	server := &http.Server{
		Addr:              addr,
		Handler:           runtime.Router,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	go func() {
		slog.Info("Starting Orange API server", "addr", addr)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("API server failed: %v", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(ctx); err != nil {
		log.Printf("server shutdown failed: %v", err)
	}
}
