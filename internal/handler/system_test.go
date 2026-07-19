package handler

import (
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestUpdateHTTPClientHasTimeout(t *testing.T) {
	require.NotNil(t, updateHTTPClient)
	require.GreaterOrEqual(t, updateHTTPClient.Timeout, 5*time.Second)
}
