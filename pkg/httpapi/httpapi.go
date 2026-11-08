package httpapi

import (
	"bytes"
	"context"
	"encoding/json"
	"log"
	"net"
	"net/http"
	_ "net/http/pprof"
	"os"
	"os/signal"
	"strconv"
	"sync"
	"syscall"
	"time"

	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/metric"
	"manga-platform/pkg/tracing"
)

func JSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if v != nil {
		_ = json.NewEncoder(w).Encode(v)
	}
}

func Fail(w http.ResponseWriter, status int, msg string) {
	JSON(w, status, map[string]string{"error": msg})
}

func Decode(r *http.Request, v any) error {
	defer r.Body.Close()
	return json.NewDecoder(r.Body).Decode(v)
}

func Env(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func Health(mux *http.ServeMux) {
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		JSON(w, http.StatusOK, map[string]string{"status": "healthy"})
	})
	mux.HandleFunc("GET /readyz", func(w http.ResponseWriter, r *http.Request) {
		JSON(w, http.StatusOK, map[string]string{"status": "ready"})
	})
}

// metrics instruments per-service HTTP request count + latency. Lazily built
// once per service; no-op when no meter provider is installed (tests).
var metricsOnce sync.Map // service -> *httpMetrics

type httpMetrics struct {
	requests metric.Int64Counter
	latency  metric.Float64Histogram
}

func metricsFor(service string) *httpMetrics {
	if m, ok := metricsOnce.Load(service); ok {
		return m.(*httpMetrics)
	}
	m := otel.Meter("manga-platform/httpapi")
	reqs, _ := m.Int64Counter("http.server.requests",
		metric.WithDescription("HTTP requests served"))
	lat, _ := m.Float64Histogram("http.server.duration_ms",
		metric.WithDescription("HTTP request duration in milliseconds"))
	hm := &httpMetrics{requests: reqs, latency: lat}
	actual, _ := metricsOnce.LoadOrStore(service, hm)
	return actual.(*httpMetrics)
}

type statusWriter struct {
	http.ResponseWriter
	status int
}

func (s *statusWriter) WriteHeader(code int) {
	s.status = code
	s.ResponseWriter.WriteHeader(code)
}

// logShipper forwards JSON access logs straight to OpenObserve's JSON ingest
// API (OOLOG_URL like "http://openobserve.observability.svc.cluster.local:5080/api/default/manga-logs/_json").
// Fire-and-forget with a short timeout; failures only print locally.
// OOLOG_AUTH holds "user:pass" for basic auth (empty = no auth header).
var logShipURL = os.Getenv("OOLOG_URL")
var logShipAuth = os.Getenv("OOLOG_AUTH")
func shipLog(service, traceID, method, path string, status int, ms int64) {
	line := map[string]any{
		"level": "info", "service": service, "trace_id": traceID,
		"method": method, "path": path, "status": status, "duration_ms": ms,
	}
	raw, _ := json.Marshal(line)
	log.Print(string(raw))
	if logShipURL == "" {
		return
	}
	go func() {
		body, _ := json.Marshal([]any{line})
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		req, err := http.NewRequestWithContext(ctx, "POST", logShipURL, bytes.NewReader(body))
		if err != nil {
			return
		}
		req.Header.Set("Content-Type", "application/json")
		if logShipAuth != "" {
			user, pass, _ := bytes.Cut([]byte(logShipAuth), []byte(":"))
			req.SetBasicAuth(string(user), string(pass))
		}
		resp, err := http.DefaultClient.Do(req)
		if err == nil {
			resp.Body.Close()
		}
	}()
}

// corsAllowOrigins comes from CORS_ALLOW_ORIGINS (comma-separated, * default for demo).
var corsAllowOrigins = os.Getenv("CORS_ALLOW_ORIGINS")

// CORS answers preflights and tags responses so browsers can call services directly.
func CORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		allow := corsAllowOrigins
		if allow == "" {
			allow = "*"
		}
		w.Header().Set("Access-Control-Allow-Origin", allow)
		w.Header().Set("Access-Control-Allow-Methods", "GET, PUT, POST, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-User-ID, X-User-Role")
		w.Header().Set("Access-Control-Max-Age", "86400")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func Logging(service string, next http.Handler) http.Handler {
	hm := metricsFor(service)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		traceID := r.Header.Get("X-Trace-ID")
		if traceID == "" {
			traceID = strconv.FormatInt(time.Now().UnixNano(), 16)
		}
		sw := &statusWriter{ResponseWriter: w, status: 200}

		next.ServeHTTP(sw, r)

		ms := time.Since(start).Milliseconds()
		attrs := []attribute.KeyValue{
			attribute.String("service", service),
			attribute.String("method", r.Method),
			attribute.String("path", r.URL.Path),
			attribute.Int("status", sw.status),
		}
		hm.requests.Add(r.Context(), 1, metric.WithAttributes(attrs...))
		hm.latency.Record(r.Context(), float64(ms), metric.WithAttributes(attrs...))
		shipLog(service, traceID, r.Method, r.URL.Path, sw.status, ms)
	})
}

func Run(service string, handler http.Handler) {
	shutdown := tracing.Setup(service)
	defer func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = shutdown(ctx)
	}()

	port := 8080
	if p := os.Getenv("PORT"); p != "" {
		if val, err := strconv.Atoi(p); err == nil {
			port = val
		}
	}

	addr := net.JoinHostPort("0.0.0.0", strconv.Itoa(port))
	srv := &http.Server{
		Addr:         addr,
		Handler:      CORS(Logging(service, otelhttp.NewHandler(handler, service))),
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  120 * time.Second,
	}
	go func() {
		log.Printf("%s listening on %s", service, addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("%s server error: %v", service, err)
		}
	}()

	// pprof on localhost only, opt-in via PPROF_PORT (e.g. "6060" for load-test profiling).
	// Never exposed via K8s Service; reach it with kubectl port-forward.
	if pprofPort := os.Getenv("PPROF_PORT"); pprofPort != "" {
		go func() {
			addr := net.JoinHostPort("127.0.0.1", pprofPort)
			log.Printf("%s pprof on %s", service, addr)
			_ = http.ListenAndServe(addr, nil)
		}()
	}

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("%s forced shutdown: %v", service, err)
	}
}
