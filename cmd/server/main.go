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
	mux.Handle("/api/", proxy)

	httpapi.Run("gateway", mux)
}
