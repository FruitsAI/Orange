package main

import "testing"

func TestMainWindowUsesCSSDragRegionWithoutNativeTitleBarOverlay(t *testing.T) {
	options := mainWindowOptions()

	if options.Mac.InvisibleTitleBarHeight != 0 {
		t.Fatalf("InvisibleTitleBarHeight = %d, want 0", options.Mac.InvisibleTitleBarHeight)
	}
}
