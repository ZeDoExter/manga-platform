// Package tracing wires every Go service to the OpenTelemetry Collector
// with zero per-service config. Endpoint comes from OTEL_EXPORTER_OTLP_ENDPOINT
// (default: local collector); empty value disables exporting (tests stay hermetic).
package tracing

import (
	"context"
	"log"
	"os"
	"time"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.26.0"
)

// Setup installs a global tracer provider for service. Call once in main.
// Returns a shutdown func; safe to call even when exporting is disabled.
func Setup(service string) func(context.Context) error {
	otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
		propagation.TraceContext{},
		propagation.Baggage{},
	))

	endpoint := os.Getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
	if endpoint == "" {
		return func(context.Context) error { return nil }
	}

	exp, err := otlptracehttp.New(context.Background(),
		otlptracehttp.WithEndpoint(endpoint),
		otlptracehttp.WithInsecure(),
		otlptracehttp.WithTimeout(5*time.Second),
	)
	if err != nil {
		log.Printf("tracing: exporter init failed for %s: %v (continuing untraced)", service, err)
		return func(context.Context) error { return nil }
	}

	res, err := resource.New(context.Background(),
		resource.WithAttributes(semconv.ServiceNameKey.String(service)),
	)
	if err != nil {
		log.Printf("tracing: resource init failed for %s: %v", service, err)
		res = resource.Default()
	}

	tp := sdktrace.NewTracerProvider(
		sdktrace.WithBatcher(exp),
		sdktrace.WithResource(res),
	)
	otel.SetTracerProvider(tp)
	log.Printf("tracing: %s exporting OTLP/HTTP to %s", service, endpoint)
	return tp.Shutdown
}
