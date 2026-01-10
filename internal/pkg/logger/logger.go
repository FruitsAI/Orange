package logger

import (
	"log/slog"
	"sync"

	"github.com/FruitsAI/Orange/internal/config"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
	"gopkg.in/natefinch/lumberjack.v2"
)

var (
	// Log is the global Zap logger
	Log  *zap.Logger
	once sync.Once
)

// Setup initializes the logger
func Setup() {
	once.Do(func() {
		// Ensure log path is configured
		logPath := config.AppConfig.LogPath
		if logPath == "" {
			logPath = "orange.log"
		}

		// Configure Lumberjack for log rotation
		rotator := &lumberjack.Logger{
			Filename:   logPath,
			MaxSize:    config.AppConfig.LogMaxSize, // MB
			MaxBackups: config.AppConfig.LogMaxBackups,
			MaxAge:     config.AppConfig.LogMaxAge, // Days
			Compress:   config.AppConfig.LogCompress,
		}

		// Configure Zap Encoder
		encoderConfig := zap.NewProductionEncoderConfig()
		encoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
		encoderConfig.TimeKey = "time"

		// Create Zap Core
		// Write to both file (rotator) and stdout if in debug mode?
		// User requested "output logs to file". Windows GUI apps don't have stdout usually.
		// So writing to rotator is primary.

		var core zapcore.Core
		fileSyncer := zapcore.AddSync(rotator)

		level := zap.InfoLevel
		if config.AppConfig.LogLevel == "debug" {
			level = zap.DebugLevel
		}

		core = zapcore.NewCore(
			zapcore.NewJSONEncoder(encoderConfig),
			fileSyncer,
			level,
		)

		// Initialize Zap Logger
		Log = zap.New(core, zap.AddCaller())

		// Redirect standard slog to use the same rotator
		// This ensures existing slog.Info() calls in the app are captured in the log file
		// matching the JSON format as closely as possible.
		slogHandler := slog.NewJSONHandler(rotator, &slog.HandlerOptions{
			Level: slogLevel(config.AppConfig.LogLevel),
		})
		slog.SetDefault(slog.New(slogHandler))

		// Also redirect standard log package to this writer
		// log.SetOutput(rotator) // specific to standard log
	})
}

// slogLevel converts string level to slog.Level
func slogLevel(level string) slog.Level {
	switch level {
	case "debug":
		return slog.LevelDebug
	case "info":
		return slog.LevelInfo
	case "warn":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}

// Sync flushes any buffered log entries
func Sync() {
	if Log != nil {
		_ = Log.Sync()
	}
}
