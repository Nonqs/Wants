package preview

import (
	"io/fs"
	"net/http"
	"os"
)

// Handler serves the compiled Angular application. Run from the wants directory,
// or set WANTS_FRONTEND_DIR to the build's browser directory.
func Handler() http.Handler {
	directory := os.Getenv("WANTS_FRONTEND_DIR")
	if directory == "" {
		directory = "frontend/dist/wants/browser"
	}
	files := os.DirFS(directory)
	static := http.FileServer(http.FS(files))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			w.Header().Set("Allow", "GET, HEAD")
			http.Error(w, "Método no permitido", http.StatusMethodNotAllowed)
			return
		}
		w.Header().Set("Cache-Control", "no-store")
		w.Header().Set("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		switch r.URL.Path {
		case "/", "/gastos", "/deseos", "/cuentas", "/mas", "/gasto-rapido":
			body, err := fs.ReadFile(files, "index.html")
			if err != nil {
				http.Error(w, "Primero compila Angular: cd frontend && npm install && npm run build", http.StatusServiceUnavailable)
				return
			}
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			if r.Method != http.MethodHead {
				_, _ = w.Write(body)
			}
		default:
			static.ServeHTTP(w, r)
		}
	})
}
