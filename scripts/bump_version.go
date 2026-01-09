package main

import (
	"fmt"
	"os"
	"regexp"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Println("Usage: go run scripts/bump_version.go <new_version>")
		os.Exit(1)
	}
	newVersion := os.Args[1]
	fmt.Printf("Bumping version to %s...\n", newVersion)

	// Helper function to update file content based on regex substitution
	updateFile := func(path string, pattern string, repl string) {
		content, err := os.ReadFile(path)
		if err != nil {
			fmt.Printf("Error reading %s: %v\n", path, err)
			return
		}

		re := regexp.MustCompile(pattern)
		// Check if match exists to provide feedback
		if !re.Match(content) {
			fmt.Printf("Warning: No match found in %s for pattern '%s'\n", path, pattern)
			return
		}

		newContent := re.ReplaceAll(content, []byte(repl))

		if err := os.WriteFile(path, newContent, 0644); err != nil {
			fmt.Printf("Error writing %s: %v\n", path, err)
			return
		}
		fmt.Printf("Updated %s\n", path)
	}

	// 1. build/config.yml
	// Pattern: version: "x.x.x"
	updateFile("build/config.yml", `version: "\d+\.\d+\.\d+"`, fmt.Sprintf(`version: "%s"`, newVersion))

	// 2. frontend/package.json
	// Pattern: "version": "x.x.x"
	updateFile("frontend/package.json", `"version": "\d+\.\d+\.\d+"`, fmt.Sprintf(`"version": "%s"`, newVersion))

	// 3. build/darwin/Info.plist & Info.dev.plist
	// Pattern: <key>CFBundleShortVersionString</key>\n\t\t<string>x.x.x</string>
	// We use capture groups to preserve the tags and indentation
	// Go regex: $1 is replacement reference
	plistPattern := `(<key>CFBundleShortVersionString</key>\s*<string>).*?(</string>)`
	updateFile("build/darwin/Info.plist", plistPattern, fmt.Sprintf("${1}%s${2}", newVersion))

	plistVersionPattern := `(<key>CFBundleVersion</key>\s*<string>).*?(</string>)`
	updateFile("build/darwin/Info.plist", plistVersionPattern, fmt.Sprintf("${1}%s${2}", newVersion))

	updateFile("build/darwin/Info.dev.plist", plistPattern, fmt.Sprintf("${1}%s${2}", newVersion))
	updateFile("build/darwin/Info.dev.plist", plistVersionPattern, fmt.Sprintf("${1}%s${2}", newVersion))

	// 4. build/windows/info.json
	// Pattern: "file_version": "x.x.x" and "ProductVersion": "x.x.x"
	updateFile("build/windows/info.json", `"file_version": "\d+\.\d+\.\d+"`, fmt.Sprintf(`"file_version": "%s"`, newVersion))
	updateFile("build/windows/info.json", `"ProductVersion": "\d+\.\d+\.\d+"`, fmt.Sprintf(`"ProductVersion": "%s"`, newVersion))

	// 5. build/linux/nfpm/nfpm.yaml
	// Pattern: version: "x.x.x"
	updateFile("build/linux/nfpm/nfpm.yaml", `version: "\d+\.\d+\.\d+"`, fmt.Sprintf(`version: "%s"`, newVersion))

	fmt.Println("All files updated successfully!")
}
