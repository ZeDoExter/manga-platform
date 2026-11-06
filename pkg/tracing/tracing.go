// Package tracing wires every Go service to the OpenTelemetry Collector
// with zero per-service config. Endpoint comes from OTEL_EXPORTER_OTLP_ENDPOINT;
// empty value disables exporting (tests stay hermetic).
package tracing

import (
	"context"
	"log"
	"os"
	"time"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetrichttp"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/metric"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.26.0"
)

// Setup installs global tracer + meter providers for service. Call once in main.
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
	ctx := context.Background()

	res, err := resource.New(ctx,
		resource.WithAttributes(semconv.ServiceNameKey.String(service)),
	)
	if err != nil {
		log.Printf("tracing: resource init failed for %s: %v", service, err)
		res = resource.Default()
	}

	shutdowns := []func(context.Context) error{}

	if texp, err := otlptracehttp.New(ctx,
		otlptracehttp.WithEndpoint(endpoint),
		otlptracehttp.WithInsecure(),
		otlptracehttp.WithTimeout(5*time.Second),
	); err != nil {
		log.Printf("tracing: trace exporter init failed for %s: %v", service, err)
	} else {
		tp := sdktrace.NewTracerProvider(
			sdktrace.WithBatcher(texp),
			sdktrace.WithResource(res),
		)
		otel.SetTracerProvider(tp)
		shutdowns = append(shutdowns, tp.Shutdown)
	}

	if mexp, err := otlpmetrichttp.New(ctx,
		otlpmetrichttp.WithEndpoint(endpoint),
		otlpmetrichttp.WithInsecure(),
		otlpmetrichttp.WithTimeout(5*time.Second),
	); err != nil {
		log.Printf("tracing: metric exporter init failed for %s: %v", service, err)
	} else {
		mp := metric.NewMeterProvider(
			metric.WithResource(res),
			metric.WithReader(metric.NewPeriodicReader(mexp, metric.WithInterval(15*time.Second))),
		)
		otel.SetMeterProvider(mp)
		shutdowns = append(shutdowns, mp.Shutdown)
	}

	log.Printf("tracing: %s exporting OTLP/HTTP to %s", service, endpoint)
	return func(ctx context.Context) error {
		for _, fn := range shutdowns {
			_ = fn(ctx)
		}
		return nil
	}
}
