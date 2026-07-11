package main

import (
	"embed"
	_ "embed"
	"io/fs"
	"log"
	"log/slog"
	"net"
	"net/http"
	"os"
	"path"
	"strconv"
	"strings"
	"time"

	"github.com/FruitsAI/Orange/internal/app"
	"github.com/FruitsAI/Orange/internal/config"
	"github.com/wailsapp/wails/v3/pkg/application"
)

// Wails 使用 Go 的 `embed` 包将前端构建产物嵌入到二进制文件中。
// frontend/dist 文件夹中的所有文件都将被嵌入，并可供前端访问。
// 详见 https://pkg.go.dev/embed 了解更多信息。

//go:embed all:frontend/dist
var assets embed.FS

// createAssetHandler 创建一个组合处理器，用于统一处理 HTTP 请求：
// 1. 将 /api/* 开头的请求路由到 Gin 框架处理 (后端接口)
// 2. 将其他请求作为静态资源服务，从嵌入的文件系统中提供前端页面
func createAssetHandler(ginRouter http.Handler) http.Handler {

	// 获取嵌入的前端静态资源
	frontendFS, err := fs.Sub(assets, "frontend/dist")
	if err != nil {
		log.Fatal("Failed to create sub filesystem:", err)
	}
	staticHandler := http.FileServer(http.FS(frontendFS))

	// 返回一个组合的 http.Handler
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// 如果是 API 请求，转交给 Gin 处理
		if strings.HasPrefix(r.URL.Path, "/api") {
			ginRouter.ServeHTTP(w, r)
			return
		}
		// 否则作为静态资源处理。React Router 的深层路由在桌面端也需要
		// 和 Vercel rewrite 一样回退到 index.html。
		assetPath := strings.TrimPrefix(path.Clean("/"+r.URL.Path), "/")
		if assetPath != "" && assetPath != "." {
			if info, err := fs.Stat(frontendFS, assetPath); err == nil && !info.IsDir() {
				staticHandler.ServeHTTP(w, r)
				return
			}
		}

		index, err := fs.ReadFile(frontendFS, "index.html")
		if err != nil {
			http.Error(w, "index.html not found", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		_, _ = w.Write(index)
	})
}

// main 是应用程序的入口点。
// 它负责初始化应用配置、日志、数据库，创建 Wails 应用实例及窗口，并启动主事件循环。
func newExternalAPIServer(addr string, handler http.Handler) *http.Server {
	return &http.Server{
		Addr:              addr,
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}
}

func mainWindowOptions() application.WebviewWindowOptions {
	return application.WebviewWindowOptions{
		Title:  "Orange",
		Width:  1280,
		Height: 800,
		Mac: application.MacWindow{
			InvisibleTitleBarHeight: 0,
			Backdrop:                application.MacBackdropTranslucent,
			TitleBar:                application.MacTitleBarHiddenInset,
		},
		BackgroundColour: application.NewRGB(27, 38, 54),
		URL:              "/",
	}
}

func main() {
	runtime, cleanup, err := app.Bootstrap(app.RuntimeModeDesktop)
	if err != nil {
		log.Fatal(err)
	}
	defer cleanup()
	ginRouter := runtime.Router

	// 7. 启动对外 API 服务 (如果启用)
	if config.AppConfig.EnableAPIServer {
		go func() {
			port := config.AppConfig.APIServerPort
			host := os.Getenv("API_SERVER_HOST")
			if host == "" {
				host = "127.0.0.1"
			}
			addr := net.JoinHostPort(host, strconv.Itoa(port))
			slog.Info("Starting external API server", "addr", addr)
			// 使用 ginRouter 作为一个普通的 http.Handler
			// 监听失败（如端口被占用）会导致所有前端 API 调用不可用，属致命错误，
			// 需明确终止进程而非静默退出 goroutine。ErrServerClosed 是正常关闭，忽略。
			if err := newExternalAPIServer(addr, ginRouter).ListenAndServe(); err != nil && err != http.ErrServerClosed {
				slog.Error("External API server failed to start", "addr", addr, "error", err)
				log.Fatalf("FATAL: 对外 API 服务启动失败 (%s): %v", addr, err)
			}
		}()
	}

	// 8. 创建组合资源处理器 (API + 前端静态资源)
	assetHandler := createAssetHandler(ginRouter)

	// 7. 创建 Wails 应用程序实例
	// 配置项说明:
	// - Name & Description: 应用元数据
	// - Assets: 配置静态资源服务，Handler 指向我们的组合处理器
	// - Mac: macOS 特定配置，如关闭最后一个窗口后是否退出应用
	app := application.New(application.Options{
		Name:        "Orange",
		Description: "FruitsAI Orange Desktop App",
		Assets: application.AssetOptions{
			Handler: assetHandler,
		},
		Mac: application.MacOptions{
			ApplicationShouldTerminateAfterLastWindowClosed: true,
		},
	})

	// 8. 创建主窗口
	// 配置项说明:
	// - Width/Height: 初始窗口大小
	// - Mac: macOS 窗口特定样式 (隐藏标题栏、半透明背景模糊等)
	// - BackgroundColour: 窗口背景色 (深色模式适配)
	// - URL: 默认加载的页面路径
	app.Window.NewWithOptions(mainWindowOptions())

	// 9. 启动应用程序
	// Run() 会阻塞当前 goroutine 直到应用退出
	err = app.Run()

	// 如果运行时发生错误，记录日志并退出
	if err != nil {
		log.Fatal(err)
	}
}
