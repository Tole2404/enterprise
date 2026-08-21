package agent

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// AgentRole defines specialized autonomous roles
type AgentRole string

const (
	RoleOrchestrator AgentRole = "ORCHESTRATOR"
	RoleInventory    AgentRole = "INVENTORY_AGENT"
	RoleProcurement  AgentRole = "PROCUREMENT_AGENT"
	RoleSales        AgentRole = "SALES_AGENT"
	RoleFinance      AgentRole = "FINANCE_AGENT"
	RoleHR           AgentRole = "HR_AGENT"
	RoleAudit        AgentRole = "AUDIT_SENTINEL"
)

// ActionRiskLevel determines if human approval is mandatory
type ActionRiskLevel string

const (
	RiskLow    ActionRiskLevel = "LOW"
	RiskMedium ActionRiskLevel = "MEDIUM"
	RiskHigh   ActionRiskLevel = "HIGH"
)

// AgentCommand represents user or system instruction
type AgentCommand struct {
	CommandID  string          `json:"command_id"`
	UserID     uuid.UUID       `json:"user_id"`
	RoleTarget AgentRole       `json:"role_target"`
	Intent     string          `json:"intent"`
	Payload    json.RawMessage `json:"payload"`
}

// ExecutionResult captures structured agent outputs
type ExecutionResult struct {
	CommandID string          `json:"command_id"`
	Role      AgentRole       `json:"role"`
	Status    string          `json:"status"` // SUCCESS, REQUIRE_APPROVAL, FAILED
	Risk      ActionRiskLevel `json:"risk_level"`
	Message   string          `json:"message"`
	Data      interface{}     `json:"data,omitempty"`
	Error     string          `json:"error,omitempty"`
	Timestamp time.Time       `json:"timestamp"`
}

// AgentTask defines an atomic step in multi-agent workflow
type AgentTask struct {
	TaskID    string    `json:"task_id"`
	Role      AgentRole `json:"role"`
	Action    string    `json:"action"`
	Params    string    `json:"params"`
	Completed bool      `json:"completed"`
}
