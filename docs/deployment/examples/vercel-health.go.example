package handler

import (
	"encoding/json"
	"net/http"

	"github.com/FruitsAI/Orange/internal/constants"
)

func Handler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"code":    0,
		"message": "ok",
		"data": map[string]any{
			"service": "Orange API POC",
			"version": constants.AppVersion,
		},
	})
}
