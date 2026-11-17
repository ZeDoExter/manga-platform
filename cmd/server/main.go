package main

import (
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"

	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
	"manga-platform/pkg/httpapi"
)

func main() {
	target, err := url.Parse(httpapi.Env("READER_URL", "http://localhost:8084"))
	if err != nil {
		log.Fatalf("invalid READER_URL: %v", err)
	}

	proxy := httputil.NewSingleHostReverseProxy(target)
	// Inject current span into proxied requests so gateway -> reader stays one trace.
	proxy.Transport = otelhttp.NewTransport(http.DefaultTransport)

	mux := http.NewServeMux()
	httpapi.Health(mux)
	mux.Handle("/api/", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Identity headers pass through untouched. Trust boundary:
		// edge clients can't smuggle them (the api.dootoon.store HTTPRoute
		// strips x-user-*), and the only in-cluster caller is the BFF,
		// which stamps them from its verified session. Stripping here
		// would demote every logged-in reader to guest (401 on paid chapters).
		proxy.ServeHTTP(w, r)
	}))

	httpapi.Run("gateway", mux)
}
