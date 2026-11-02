package preview

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestAngularBuildServing(t *testing.T) {
	directory := t.TempDir()
	t.Setenv("WANTS_FRONTEND_DIR", directory)
	const index = "<!doctype html><app-root></app-root>"
	if err := os.WriteFile(filepath.Join(directory, "index.html"), []byte(index), 0600); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(directory, "main.js"), []byte("// compiled application"), 0600); err != nil {
		t.Fatal(err)
	}
	handler := Handler()
	for _, path := range []string{"/", "/gastos", "/deseos", "/cuentas", "/mas", "/gasto-rapido"} {
		t.Run(path, func(t *testing.T) {
			recorder := httptest.NewRecorder()
			handler.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, path, nil))
			if recorder.Code != http.StatusOK || recorder.Body.String() != index {
				t.Fatalf("route %s: %d %q", path, recorder.Code, recorder.Body.String())
			}
			if recorder.Header().Get("Cache-Control") != "no-store" {
				t.Fatal("private pages must not be cached")
			}
		})
	}
	for _, test := range []struct {
		method, path string
		status       int
	}{
		{http.MethodHead, "/gasto-rapido", http.StatusOK},
		{http.MethodGet, "/main.js", http.StatusOK},
		{http.MethodGet, "/missing.js", http.StatusNotFound},
		{http.MethodPost, "/gastos", http.StatusMethodNotAllowed},
	} {
		recorder := httptest.NewRecorder()
		handler.ServeHTTP(recorder, httptest.NewRequest(test.method, test.path, nil))
		if recorder.Code != test.status {
			t.Errorf("%s %s: got %d, want %d", test.method, test.path, recorder.Code, test.status)
		}
		if test.method == http.MethodHead && recorder.Body.Len() != 0 {
			t.Error("HEAD returned a body")
		}
	}
}

func TestMissingAngularBuildExplainsPreparation(t *testing.T) {
	t.Setenv("WANTS_FRONTEND_DIR", t.TempDir())
	recorder := httptest.NewRecorder()
	Handler().ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/gasto-rapido", nil))
	if recorder.Code != http.StatusServiceUnavailable || !strings.Contains(recorder.Body.String(), "npm run build") {
		t.Fatalf("missing build: %d %q", recorder.Code, recorder.Body.String())
	}
}
