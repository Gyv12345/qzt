package xcache_test

import (
	"testing"

	"qzt-go-server/pkg/xcache"
)

func TestNewRedisCache_NilClient(t *testing.T) {
	_, err := xcache.NewRedisCache(nil)
	if err == nil {
		t.Fatal("expected error for nil redis client")
	}
}
