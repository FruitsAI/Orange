package app

import "testing"

func TestRuntimeModeValues(t *testing.T) {
	if RuntimeModeDesktop != "desktop" {
		t.Fatalf("RuntimeModeDesktop = %q", RuntimeModeDesktop)
	}
	if RuntimeModeServer != "server" {
		t.Fatalf("RuntimeModeServer = %q", RuntimeModeServer)
	}
}
