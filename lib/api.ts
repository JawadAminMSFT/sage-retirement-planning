import { mockApiResponses, mockUserProfiles, generateMockChatResponse, simulateMockStreaming, generateMockProjection } from "./mockData"

// API Configuration
let API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8172"
const MOCK_DELAY = Number.parseInt(process.env.NEXT_PUBLIC_MOCK_DELAY || "1000")

// Always start in mock mode
let currentApiMode: ApiMode = "mock"
let currentBackendUrl: string = API_BASE_URL

export type ApiMode = "live" | "mock"

export const setApiMode = (mode: ApiMode) => {
  currentApiMode = mode
}

export const getApiMode = (): ApiMode => {
  return currentApiMode
}

export const setBackendUrl = (url: string) => {
  currentBackendUrl = url
  API_BASE_URL = url
}

export const getBackendUrl = (): string => {
  return currentBackendUrl
}

// Type definitions
export interface UserProfile {
  id: string
  name: string
  age: number
  current_cash: number
  investment_assets: number
  yearly_savings_rate: number
  salary: number
  portfolio: { [key: string]: number }
  risk_appetite: "low" | "medium" | "high"
  target_retire_age: number
  target_monthly_income: number
  description?: string
}

export interface ProductRecommendation {
  name: string
  allocation: number
  exp_return?: number
  risk_rating?: string
  asset_class?: string
}

export interface CashflowPoint {
  year: number
  end_assets: number
}

export interface Metrics {
  monthly_income: number
  success_rate_pct: number
  risk_level: "low" | "medium" | "high"
  flexibility?: string
  time_horizon_years?: number
}

export interface Deltas {
  additional_savings_monthly?: number
  retirement_income_monthly?: number
  retirement_income_delta?: number
  success_rate_delta_pct?: number
  extra_years_income_duration?: number
}

export interface Predictions {
  metrics: Metrics
  deltas?: Deltas
  products: ProductRecommendation[]
  cashflows: CashflowPoint[]
}

export interface AnalysisData {
  scenario: UserProfile
  recommended_changes: { [key: string]: any }
  predictions: Predictions
  follow_ups: string[]
  alternatives: string[]
  considerations: string
}

export interface ChatMessage {
  role: "user" | "assistant"
  content: string
  timestamp: number
}

export interface ChatRequest {
  message: string
  profile?: UserProfile
  history: ChatMessage[]
}

export interface ChatResponse {
  response: string
  analysis?: AnalysisData
  status: string
}

export interface StreamingUpdate {
  type: "status" | "content" | "analysis" | "complete"
  data: any
  timestamp: number
}

export interface HealthResponse {
  status: string
  agent_id?: string
}

export interface ScenariosResponse {
  scenarios: string[]
}

export interface ProfilesResponse {
  profiles: UserProfile[]
}

export interface EvaluationContext {
  thread_id: string
  run_id: string
}

export interface EvaluationResult {
  status: string
  thread_id: string
  run_id: string
  evaluations: {
    intent_resolution?: any
    tool_call_accuracy?: any
    task_adherence?: any
  }
  timestamp: number
}

// ─── Scenario Projection Types ──────────────────────────────────────────────

export interface ProjectedAccount {
  id: string
  name: string
  current_value: number
  projected_value: number
  change: number
  change_percent: number
}

export interface ProjectedHolding {
  symbol: string
  name: string
  current_value: number
  projected_value: number
  current_allocation: number
  projected_allocation: number
  change: number
  change_percent: number
}

export interface ProjectionAssumptions {
  market_return_annual: number
  inflation_rate: number
  contribution_limit_401k: number
  contribution_limit_ira: number
}

export interface ScenarioProjectionRequest {
  profile_id: string
  scenario_description: string
  timeframe_months: number
  current_portfolio: {
    total_value: number
    accounts: Array<{
      id: string
      name: string
      balance: number
    }>
    holdings: Array<{
      symbol: string
      name: string
      value: number
      allocation: number
    }>
  }
}

export interface ScenarioProjectionResponse {
  projection: {
    total_value: number
    total_change: number
    total_change_percent: number
    accounts: ProjectedAccount[]
    holdings: ProjectedHolding[]
  }
  assumptions: ProjectionAssumptions
  summary: string
  risks: string[]
  opportunities: string[]
}

// Utility functions
const simulateDelay = (ms: number = MOCK_DELAY): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const makeApiCall = async (endpoint: string, options: RequestInit = {}): Promise<Response> => {
  const url = `${currentBackendUrl}${endpoint}`
  return fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  })
}

// API Functions
export const checkHealth = async (): Promise<HealthResponse> => {
  if (currentApiMode === "mock") {
    await simulateDelay(500)
    return mockApiResponses.health
  }

  try {
    const response = await makeApiCall("/health")
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    throw new Error(`Health check failed: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

export const getQuickScenarios = async (): Promise<string[]> => {
  if (currentApiMode === "mock") {
    await simulateDelay(300)
    return mockApiResponses.scenarios.scenarios
  }

  try {
    const response = await makeApiCall("/scenarios")
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data: ScenariosResponse = await response.json()
    return data.scenarios
  } catch (error) {
    throw new Error(`Failed to fetch scenarios: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

export const getUserProfiles = async (): Promise<UserProfile[]> => {
  if (currentApiMode === "mock") {
    await simulateDelay(400)
    return mockApiResponses.profiles
  }

  try {
    const response = await makeApiCall("/profiles")
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data: ProfilesResponse = await response.json()
    return data.profiles
  } catch (error) {
    throw new Error(`Failed to fetch profiles: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

export async function* chatWithAssistantStreaming(request: ChatRequest): AsyncGenerator<StreamingUpdate> {
  if (currentApiMode === "mock") {
    yield* simulateMockStreaming(request.message, request.profile || mockUserProfiles[0])
    return
  }

  try {
    const response = await makeApiCall("/chat/stream", {
      method: "POST",
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error("No response body")
    }

    const decoder = new TextDecoder()
    let buffer = ""

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split("\n")
      buffer = lines.pop() || ""

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6))
            yield data as StreamingUpdate
          } catch (e) {
            console.error("Failed to parse streaming data:", e)
          }
        }
      }
    }
  } catch (error) {
    throw new Error(`Streaming chat failed: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

export const chatWithAssistant = async (request: ChatRequest): Promise<ChatResponse> => {
  if (currentApiMode === "mock") {
    await simulateDelay()
    return generateMockChatResponse(request.message, request.profile || mockUserProfiles[0])
  }

  try {
    const response = await makeApiCall("/chat", {
      method: "POST",
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    throw new Error(`Chat request failed: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

export const getApiStatus = async () => {
  try {
    if (currentApiMode === "mock") {
      return {
        mode: "mock",
        status: "ready",
        message: "Using mock data for testing",
        backend_url: "mock://localhost",
      }
    }

    const health = await checkHealth()
    return {
      mode: "live",
      status: health.status === "healthy" ? "healthy" : "error",
      message: health.status === "healthy" ? "Connected to backend" : "Backend unavailable",
      backend_url: currentBackendUrl,
      agent_id: health.agent_id,
    }
  } catch (error) {
    return {
      mode: currentApiMode,
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error",
      backend_url: currentBackendUrl,
    }
  }
}

export const evaluateAgentRun = async (context: EvaluationContext): Promise<EvaluationResult> => {
  if (currentApiMode === "mock") {
    await simulateDelay(1500) // Simulate processing time
    return {
      status: "completed",
      thread_id: context.thread_id,
      run_id: context.run_id,
      evaluations: {
        intent_resolution: {
          intent_resolution: 4.0,
          intent_resolution_result: "pass",
          intent_resolution_threshold: 3,
          intent_resolution_reason: "Mock evaluation - intent properly understood"
        },
        tool_call_accuracy: {
          tool_call_accuracy: 4.5,
          tool_call_accuracy_result: "pass", 
          tool_call_accuracy_threshold: 3,
          details: {
            tool_calls_made_by_agent: 1,
            correct_tool_calls_made_by_agent: 1
          }
        },
        task_adherence: {
          task_adherence: 4.2,
          task_adherence_result: "pass",
          task_adherence_threshold: 3,
          task_adherence_reason: "Mock evaluation - task completed successfully"
        }
      },
      timestamp: Date.now()
    }
  }

  try {
    const response = await makeApiCall(`/evaluate/${context.thread_id}/${context.run_id}`, {
      method: "POST"
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    throw new Error(`Evaluation failed: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

// ─── Scenario Projection API ────────────────────────────────────────────────

export const projectScenario = async (
  request: ScenarioProjectionRequest
): Promise<ScenarioProjectionResponse> => {
  if (currentApiMode === "mock") {
    await simulateDelay(1500) // Simulate AI processing time
    return generateMockProjection(request)
  }

  try {
    const response = await makeApiCall("/api/project-scenario", {
      method: "POST",
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    throw new Error(
      `Scenario projection failed: ${error instanceof Error ? error.message : "Unknown error"}`
    )
  }
}

// ─── Conversation Storage API ───────────────────────────────────────────────

export interface ConversationMessage {
  id?: string
  role: "user" | "assistant"
  content: string
  timestamp?: string
}

export interface ConversationSummary {
  id: string
  title: string
  message_count: number
  created_at: string
  updated_at: string
  preview: string
}

export interface Conversation {
  id: string
  user_id: string
  title: string
  messages: ConversationMessage[]
  created_at: string
  updated_at: string
}

export const listConversations = async (userId: string): Promise<ConversationSummary[]> => {
  if (currentApiMode === "mock") {
    await simulateDelay(200)
    // Return empty for mock mode - conversations stored in memory
    return []
  }

  try {
    const response = await makeApiCall(`/api/conversations/${userId}`)
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    const data = await response.json()
    return data.conversations || []
  } catch (error) {
    console.error("Failed to list conversations:", error)
    return []
  }
}

export const getConversation = async (userId: string, conversationId: string): Promise<Conversation | null> => {
  if (currentApiMode === "mock") {
    return null
  }

  try {
    const response = await makeApiCall(`/api/conversations/${userId}/${conversationId}`)
    if (!response.ok) return null
    return await response.json()
  } catch (error) {
    console.error("Failed to get conversation:", error)
    return null
  }
}

export const saveConversation = async (
  userId: string,
  title: string,
  messages: ConversationMessage[],
  conversationId?: string
): Promise<string | null> => {
  if (currentApiMode === "mock") {
    return null // Mock mode doesn't persist
  }

  try {
    const url = conversationId
      ? `/api/conversations/${userId}/${conversationId}`
      : `/api/conversations/${userId}`
    const method = conversationId ? "PUT" : "POST"

    const response = await makeApiCall(url, {
      method,
      body: JSON.stringify({
        user_id: userId,
        conversation_id: conversationId,
        title,
        messages: messages.map(m => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.timestamp || new Date().toISOString()
        }))
      })
    })

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    const data = await response.json()
    return data.id || conversationId
  } catch (error) {
    console.error("Failed to save conversation:", error)
    return null
  }
}

export const deleteConversation = async (userId: string, conversationId: string): Promise<boolean> => {
  if (currentApiMode === "mock") {
    return false
  }

  try {
    const response = await makeApiCall(`/api/conversations/${userId}/${conversationId}`, {
      method: "DELETE"
    })
    return response.ok
  } catch (error) {
    console.error("Failed to delete conversation:", error)
    return false
  }
}

// ─── Scenario Storage API ───────────────────────────────────────────────────

export interface SavedScenarioSummary {
  id: string
  name: string
  description: string
  timeframe_months: number
  created_at: string
  total_change_percent: number
}

export interface SavedScenario {
  id: string
  user_id: string
  name: string
  description: string
  timeframe_months: number
  projection_result: ScenarioProjectionResponse
  created_at: string
}

export const listSavedScenarios = async (userId: string): Promise<SavedScenarioSummary[]> => {
  if (currentApiMode === "mock") {
    await simulateDelay(200)
    return []
  }

  try {
    const response = await makeApiCall(`/api/saved-scenarios/${userId}`)
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    const data = await response.json()
    return data.scenarios || []
  } catch (error) {
    console.error("Failed to list scenarios:", error)
    return []
  }
}

export const getSavedScenario = async (userId: string, scenarioId: string): Promise<SavedScenario | null> => {
  if (currentApiMode === "mock") {
    return null
  }

  try {
    const response = await makeApiCall(`/api/saved-scenarios/${userId}/${scenarioId}`)
    if (!response.ok) return null
    return await response.json()
  } catch (error) {
    console.error("Failed to get scenario:", error)
    return null
  }
}

export const saveScenario = async (
  userId: string,
  name: string,
  description: string,
  timeframeMonths: number,
  projectionResult: ScenarioProjectionResponse
): Promise<string | null> => {
  if (currentApiMode === "mock") {
    return null
  }

  try {
    const response = await makeApiCall(`/api/saved-scenarios/${userId}`, {
      method: "POST",
      body: JSON.stringify({
        name,
        description,
        timeframe_months: timeframeMonths,
        projection_result: projectionResult
      })
    })

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
    const data = await response.json()
    return data.id
  } catch (error) {
    console.error("Failed to save scenario:", error)
    return null
  }
}

export const deleteSavedScenario = async (userId: string, scenarioId: string): Promise<boolean> => {
  if (currentApiMode === "mock") {
    return false
  }

  try {
    const response = await makeApiCall(`/api/saved-scenarios/${userId}/${scenarioId}`, {
      method: "DELETE"
    })
    return response.ok
  } catch (error) {
    console.error("Failed to delete scenario:", error)
    return false
  }
}

export { API_BASE_URL, simulateDelay }
