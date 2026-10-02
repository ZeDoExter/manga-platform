package main

import (
	"context"
	"encoding/json"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"manga-platform/pkg/imagestore"
	"manga-platform/services/catalog"
	"manga-platform/services/commerce"
	"manga-platform/services/identity"
	"manga-platform/services/moderation"
	"manga-platform/services/reader"
)

type Server struct {
	catalog  *catalog.Service
	commerce *commerce.Service
	identity *identity.Service
	reader   *reader.Service
	mod      *moderation.Service
	storage  imagestore.ImageStore
}

func NewServer() *Server {
	secret := []byte(os.Getenv("HMAC_SECRET"))
	if len(secret) == 0 {
		secret = []byte("default-dev-hmac-secret-32-bytes")
	}

	baseURL := os.Getenv("CDN_BASE_URL")
	if baseURL == "" {
		baseURL = "https://img.yourmanga.com"
	}

	store := imagestore.NewMemoryStore(baseURL, secret)
	cat := catalog.NewService()
	com := commerce.NewService()
	id := identity.NewService()
	rdr := reader.NewService(cat, com, id, store)
	mod := moderation.NewService(cat, com, id, store)

	return &Server{
		catalog:  cat,
		commerce: com,
		identity: id,
		reader:   rdr,
		mod:      mod,
		storage:  store,
	}
}

func (s *Server) Routes() http.Handler {
	mux := http.NewServeMux()

	// Probes for Kubernetes Zero-Downtime Rolling Update (Bonus 2)
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]string{"status": "healthy"})
	})

	mux.HandleFunc("GET /readyz", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]string{"status": "ready"})
	})

	// Reading endpoint
	mux.HandleFunc("GET /api/chapters/{id}/read", func(w http.ResponseWriter, r *http.Request) {
		chapID := r.PathValue("id")
		userID := r.Header.Get("X-User-ID")
		role := identity.Role(r.Header.Get("X-User-Role"))
		if role == "" {
			role = identity.RoleGuest
		}

		resp, err := s.reader.ReadChapter(r.Context(), reader.ReadChapterRequest{
			UserID:    userID,
			Role:      role,
			ChapterID: chapID,
		})
		if err != nil {
			status := http.StatusInternalServerError
			switch err {
			case reader.ErrLoginRequired:
				status = http.StatusUnauthorized
			case reader.ErrPaymentRequired:
				status = http.StatusPaymentRequired
			case reader.ErrContentUnavailable:
				status = http.StatusGone
			}
			http.Error(w, err.Error(), status)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(resp)
	})

	return loggingMiddleware(mux)
}

// loggingMiddleware emits structured JSON logs with trace_id (Bonus 3: Observability).
func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		traceID := r.Header.Get("X-Trace-ID")
		if traceID == "" {
			traceID = strconv.FormatInt(time.Now().UnixNano(), 16)
		}

		next.ServeHTTP(w, r)

		log.Printf(`{"level":"info","trace_id":"%s","method":"%s","path":"%s","duration_ms":%d}`,
			traceID, r.Method, r.URL.Path, time.Since(start).Milliseconds())
	})
}

func main() {
	srv := NewServer()

	port := 8080
	if p := os.Getenv("PORT"); p != "" {
		if val, err := strconv.Atoi(p); err == nil {
			port = val
		}
	}

	addr := net.JoinHostPort("0.0.0.0", strconv.Itoa(port))
	httpServer := &http.Server{
		Addr:         addr,
		Handler:      srv.Routes(),
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	go func() {
		log.Printf("Starting Manga Platform server on %s", addr)
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
	}()

	// Graceful shutdown on SIGTERM / SIGINT
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server gracefully...")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := httpServer.Shutdown(ctx); err != nil {
		log.Printf("Server forced shutdown: %v", err)
	}
	log.Println("Server exited cleanly.")
}
