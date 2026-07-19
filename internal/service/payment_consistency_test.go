package service

import (
	"testing"

	"github.com/FruitsAI/Orange/internal/database"
	"github.com/FruitsAI/Orange/internal/dto"
	"github.com/FruitsAI/Orange/internal/models"
	"github.com/stretchr/testify/require"
)

// TestPaymentSyncsProjectReceivedAmount 验证款项的创建、确认、删除
// 都会在事务内正确同步项目的 received_amount，覆盖资金一致性核心逻辑。
func TestPaymentSyncsProjectReceivedAmount(t *testing.T) {
	setupServiceTestDB(t)

	db := database.GetDB()
	project := models.Project{
		Name:           "Consistency Project",
		Company:        "Consistency Co",
		TotalAmount:    1000,
		Status:         "active",
		Type:           "web",
		ContractNumber: "HT202607010001",
		UserID:         9001,
	}
	require.NoError(t, db.Create(&project).Error)

	svc := NewPaymentService()

	// 1. 创建一笔待收款项，received_amount 不应变化
	p1, err := svc.Create(dto.PaymentRequest{
		ProjectID: project.ID,
		UserID:    9001,
		Stage:     "首付款",
		Amount:    300,
		PlanDate:  "2026-07-01",
		Status:    "pending",
	})
	require.NoError(t, err)
	require.InDelta(t, 30.0, p1.Percentage, 0.001, "百分比应为 300/1000*100")

	var proj models.Project
	require.NoError(t, db.First(&proj, project.ID).Error)
	require.InDelta(t, 0.0, proj.ReceivedAmount, amountEpsilon, "待收款不应计入已收")

	// 2. 确认收款后，received_amount 应变为 300
	require.NoError(t, svc.ConfirmForUser(9001, p1.ID, "2026-07-02", "bank_transfer"))
	require.NoError(t, db.First(&proj, project.ID).Error)
	require.InDelta(t, 300.0, proj.ReceivedAmount, amountEpsilon, "确认后应同步已收金额")

	// 3. 删除已收款项后，received_amount 应回到 0
	require.NoError(t, svc.DeleteForUser(9001, p1.ID))
	require.NoError(t, db.First(&proj, project.ID).Error)
	require.InDelta(t, 0.0, proj.ReceivedAmount, amountEpsilon, "删除后应同步回退已收金额")
}
