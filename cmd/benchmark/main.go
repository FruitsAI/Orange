package main

import (
	"flag"
	"fmt"
	"testing"
	"time"

	"github.com/FruitsAI/Orange/internal/config"
	"github.com/FruitsAI/Orange/internal/constants"
	"github.com/FruitsAI/Orange/internal/database"
	"github.com/FruitsAI/Orange/internal/dto"
	"github.com/FruitsAI/Orange/internal/models"
	"github.com/FruitsAI/Orange/internal/service"
)

// BenchmarkProjectService_Create 项目创建性能测试
func BenchmarkProjectService_Create(b *testing.B) {
	setupBenchmarkDB()
	svc := service.NewProjectService()

	// 创建测试用户
	user := &models.User{
		Username: "benchuser",
		Password: "hashed",
		Email:    "bench@test.com",
		Role:     constants.RoleUser,
		Status:   1,
	}
	db := database.GetDB()
	db.Create(user)

	req := dto.CreateProjectRequest{
		Name:           "性能测试项目",
		Company:        "测试公司",
		ContractNumber: "BENCH-001",
		TotalAmount:    100000,
		StartDate:      time.Now().Format("2006-01-02"),
		EndDate:        time.Now().AddDate(0, 6, 0).Format("2006-01-02"),
		Status:         constants.ProjectStatusOngoing,
		UserID:         user.ID,
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		req.ContractNumber = fmt.Sprintf("BENCH-%d", i)
		svc.Create(req)
	}
}

// BenchmarkProjectService_List 项目列表查询性能测试
func BenchmarkProjectService_List(b *testing.B) {
	setupBenchmarkDB()
	svc := service.NewProjectService()

	// 创建测试数据
	user := &models.User{
		Username: "listuser",
		Password: "hashed",
		Email:    "list@test.com",
		Role:     constants.RoleUser,
		Status:   1,
	}
	db := database.GetDB()
	db.Create(user)

	// 创建100个项目
	for i := 0; i < 100; i++ {
		req := dto.CreateProjectRequest{
			Name:           fmt.Sprintf("项目%d", i),
			Company:        "公司",
			ContractNumber: fmt.Sprintf("LIST-%d", i),
			TotalAmount:    100000,
			StartDate:      time.Now().Format("2006-01-02"),
			EndDate:        time.Now().AddDate(0, 6, 0).Format("2006-01-02"),
			Status:         constants.ProjectStatusOngoing,
			UserID:         user.ID,
		}
		svc.Create(req)
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		svc.List(user.ID, "", "", 1, 10)
	}
}

// BenchmarkPaymentService_Create 款项创建性能测试
func BenchmarkPaymentService_Create(b *testing.B) {
	setupBenchmarkDB()
	projectSvc := service.NewProjectService()
	paymentSvc := service.NewPaymentService()

	// 创建测试数据
	user := &models.User{
		Username: "paymentuser",
		Password: "hashed",
		Email:    "payment@test.com",
		Role:     constants.RoleUser,
		Status:   1,
	}
	db := database.GetDB()
	db.Create(user)

	projectReq := dto.CreateProjectRequest{
		Name:           "款项测试项目",
		Company:        "测试公司",
		ContractNumber: "PAY-BENCH",
		TotalAmount:    1000000,
		StartDate:      time.Now().Format("2006-01-02"),
		EndDate:        time.Now().AddDate(0, 12, 0).Format("2006-01-02"),
		Status:         constants.ProjectStatusOngoing,
		UserID:         user.ID,
	}
	project, _ := projectSvc.Create(projectReq)

	req := dto.PaymentRequest{
		ProjectID: project.ID,
		Amount:    10000,
		Stage:     "测试款项",
		PlanDate:  time.Now().Format("2006-01-02"),
		Status:    constants.PaymentStatusPending,
		UserID:    user.ID,
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		paymentSvc.Create(req)
	}
}

// BenchmarkPaymentService_Confirm 款项确认性能测试（含事务）
func BenchmarkPaymentService_Confirm(b *testing.B) {
	setupBenchmarkDB()
	projectSvc := service.NewProjectService()
	paymentSvc := service.NewPaymentService()

	// 创建测试数据
	user := &models.User{
		Username: "confirmuser",
		Password: "hashed",
		Email:    "confirm@test.com",
		Role:     constants.RoleUser,
		Status:   1,
	}
	db := database.GetDB()
	db.Create(user)

	projectReq := dto.CreateProjectRequest{
		Name:           "确认测试项目",
		Company:        "测试公司",
		ContractNumber: "CONF-BENCH",
		TotalAmount:    10000000,
		StartDate:      time.Now().Format("2006-01-02"),
		EndDate:        time.Now().AddDate(0, 12, 0).Format("2006-01-02"),
		Status:         constants.ProjectStatusOngoing,
		UserID:         user.ID,
	}
	project, _ := projectSvc.Create(projectReq)

	// 创建N个待确认款项
	payments := make([]*models.Payment, b.N)
	for i := 0; i < b.N; i++ {
		req := dto.PaymentRequest{
			ProjectID: project.ID,
			Amount:    1000,
			Stage:     fmt.Sprintf("款项%d", i),
			PlanDate:  time.Now().Format("2006-01-02"),
			Status:    constants.PaymentStatusPending,
			UserID:    user.ID,
		}
		payment, _ := paymentSvc.Create(req)
		payments[i] = payment
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		paymentSvc.ConfirmForUser(user.ID, payments[i].ID, time.Now().Format("2006-01-02"), "bank")
	}
}

// BenchmarkDashboardService_GetStats Dashboard统计性能测试
func BenchmarkDashboardService_GetStats(b *testing.B) {
	setupBenchmarkDB()
	dashboardSvc := service.NewDashboardService()
	projectSvc := service.NewProjectService()

	// 创建测试数据
	user := &models.User{
		Username: "dashuser",
		Password: "hashed",
		Email:    "dash@test.com",
		Role:     constants.RoleUser,
		Status:   1,
	}
	db := database.GetDB()
	db.Create(user)

	// 创建50个项目
	for i := 0; i < 50; i++ {
		req := dto.CreateProjectRequest{
			Name:           fmt.Sprintf("统计项目%d", i),
			Company:        "公司",
			ContractNumber: fmt.Sprintf("DASH-%d", i),
			TotalAmount:    100000,
			StartDate:      time.Now().Format("2006-01-02"),
			EndDate:        time.Now().AddDate(0, 6, 0).Format("2006-01-02"),
			Status:         constants.ProjectStatusOngoing,
			UserID:         user.ID,
		}
		projectSvc.Create(req)
	}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		dashboardSvc.GetStats(user.ID, "all")
	}
}

func setupBenchmarkDB() {
	config.AppConfig = &config.Config{
		DBType: "sqlite",
		DBPath: "file:benchmark_test?mode=memory&cache=shared",
	}
	db := database.GetDB()
	db.AutoMigrate(&models.User{}, &models.Project{}, &models.Payment{})
}

// 主函数用于手动运行基准测试
func main() {
	flag.Parse()

	fmt.Println("运行性能基准测试...")
	fmt.Println("=" * 60)

	// 运行项目创建测试
	fmt.Println("\n1. 项目创建性能:")
	result := testing.Benchmark(BenchmarkProjectService_Create)
	fmt.Printf("   迭代次数: %d\n", result.N)
	fmt.Printf("   每次操作: %v\n", result.NsPerOp())
	fmt.Printf("   吞吐量: %.0f ops/s\n", float64(result.N)/result.T.Seconds())

	// 运行项目列表查询测试
	fmt.Println("\n2. 项目列表查询性能:")
	result = testing.Benchmark(BenchmarkProjectService_List)
	fmt.Printf("   迭代次数: %d\n", result.N)
	fmt.Printf("   每次操作: %v\n", result.NsPerOp())
	fmt.Printf("   吞吐量: %.0f ops/s\n", float64(result.N)/result.T.Seconds())

	// 运行款项创建测试
	fmt.Println("\n3. 款项创建性能:")
	result = testing.Benchmark(BenchmarkPaymentService_Create)
	fmt.Printf("   迭代次数: %d\n", result.N)
	fmt.Printf("   每次操作: %v\n", result.NsPerOp())
	fmt.Printf("   吞吐量: %.0f ops/s\n", float64(result.N)/result.T.Seconds())

	// 运行款项确认测试
	fmt.Println("\n4. 款项确认性能(含事务):")
	result = testing.Benchmark(BenchmarkPaymentService_Confirm)
	fmt.Printf("   迭代次数: %d\n", result.N)
	fmt.Printf("   每次操作: %v\n", result.NsPerOp())
	fmt.Printf("   吞吐量: %.0f ops/s\n", float64(result.N)/result.T.Seconds())

	// 运行Dashboard统计测试
	fmt.Println("\n5. Dashboard统计性能:")
	result = testing.Benchmark(BenchmarkDashboardService_GetStats)
	fmt.Printf("   迭代次数: %d\n", result.N)
	fmt.Printf("   每次操作: %v\n", result.NsPerOp())
	fmt.Printf("   吞吐量: %.0f ops/s\n", float64(result.N)/result.T.Seconds())

	fmt.Println("\n" + "="*60)
	fmt.Println("性能测试完成")
}
