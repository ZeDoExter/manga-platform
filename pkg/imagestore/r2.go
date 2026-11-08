package imagestore

import (
	"bytes"
	"context"
	"errors"
	"io"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

// R2Config holds connection settings for Cloudflare R2 (ADR-001).
type R2Config struct {
	AccountID       string
	AccessKeyID     string
	SecretAccessKey string
	BucketName      string
	CustomDomain    string // e.g. "https://img.dootoon.store"
	TokenSecret     []byte // HMAC secret validated at Cloudflare edge worker/WAF
}

// R2Store implements ImageStore for Cloudflare R2.
// Per ADR-001, reads are served via Cloudflare edge using HMAC-signed expiring tokens,
// while writes/deletes go to R2 via S3-compatible API.
type R2Store struct {
	cfg    R2Config
	client *s3.Client
}

// NewR2Store creates an R2Store instance.
func NewR2Store(ctx context.Context, cfg R2Config) (*R2Store, error) {
	if cfg.CustomDomain == "" {
		return nil, errors.New("custom domain is required for R2 store")
	}
	if cfg.AccountID == "" || cfg.AccessKeyID == "" || cfg.SecretAccessKey == "" || cfg.BucketName == "" {
		return nil, errors.New("r2 credentials and bucket are required")
	}
	awsCfg, err := config.LoadDefaultConfig(ctx,
		config.WithRegion("auto"),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
			cfg.AccessKeyID, cfg.SecretAccessKey, "",
		)),
	)
	if err != nil {
		return nil, err
	}
	client := s3.NewFromConfig(awsCfg, func(o *s3.Options) {
		o.BaseEndpoint = aws.String("https://" + cfg.AccountID + ".r2.cloudflarestorage.com")
		o.UsePathStyle = true
	})
	return &R2Store{cfg: cfg, client: client}, nil
}

// SignURL satisfies ImageStore and FR-R4 using edge HMAC tokens.
func (r *R2Store) SignURL(_ context.Context, key string, expires time.Duration) (string, error) {
	return BuildSignedURL(r.cfg.CustomDomain, key, expires, r.cfg.TokenSecret)
}

// Put uploads an object to R2.
func (r *R2Store) Put(ctx context.Context, key string, reader io.Reader, size int64, contentType string) error {
	cleaned, err := CleanKey(key)
	if err != nil {
		return err
	}
	if contentType == "" {
		contentType = "application/octet-stream"
	}
	_, err = r.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:        aws.String(r.cfg.BucketName),
		Key:           aws.String(cleaned),
		Body:          reader,
		ContentLength: aws.Int64(size),
		ContentType:   aws.String(contentType),
	})
	return err
}

// Get fetches an object directly. Note that readers should fetch via SignURL/CDN (NFR-Scale-2).
func (r *R2Store) Get(ctx context.Context, key string) (io.ReadCloser, error) {
	cleaned, err := CleanKey(key)
	if err != nil {
		return nil, err
	}
	out, err := r.client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(r.cfg.BucketName),
		Key:    aws.String(cleaned),
	})
	if err != nil {
		return nil, err
	}
	return out.Body, nil
}

// GetBytes is a convenience helper for small reads (tests, confirm flows).
func (r *R2Store) GetBytes(ctx context.Context, key string) ([]byte, error) {
	rc, err := r.Get(ctx, key)
	if err != nil {
		return nil, err
	}
	defer rc.Close()
	return io.ReadAll(rc)
}

// Delete removes an object from R2.
func (r *R2Store) Delete(ctx context.Context, key string) error {
	cleaned, err := CleanKey(key)
	if err != nil {
		return err
	}
	_, err = r.client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(r.cfg.BucketName),
		Key:    aws.String(cleaned),
	})
	return err
}

// ListPrefix lists keys under a prefix (PrefixLister for takedown wipes).
func (r *R2Store) ListPrefix(ctx context.Context, prefix string) ([]string, error) {
	var out []string
	p := s3.NewListObjectsV2Paginator(r.client, &s3.ListObjectsV2Input{
		Bucket: aws.String(r.cfg.BucketName),
		Prefix: aws.String(prefix),
	})
	for p.HasMorePages() {
		page, err := p.NextPage(ctx)
		if err != nil {
			return nil, err
		}
		for _, o := range page.Contents {
			out = append(out, aws.ToString(o.Key))
		}
	}
	return out, nil
}

var _ = bytes.MinRead // keep bytes import if unused in future edits
