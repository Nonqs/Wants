// Preview serves the visual prototype without touching CLI or financial data.
package main

import (
	"log"
	"net/http"
	"time"

	"github.com/nonqs/expenseTracker/internal/preview"
)

func main() {
	server := &http.Server{Addr: "127.0.0.1:8080", Handler: preview.Handler(), ReadHeaderTimeout: 5 * time.Second}
	log.Print("Vista previa: http://127.0.0.1:8080 (datos ficticios, sin persistencia)")
	log.Fatal(server.ListenAndServe())
}
