# Retirement Planning API Backend

A FastAPI-based backend service for AI-powered retirement planning analysis using Azure AI Projects.

## Features

- **FastAPI REST API** with automatic OpenAPI documentation
- **Azure AI Projects integration** for intelligent retirement analysis
- **Pydantic models** for data validation and serialization
- **Thread management** for conversational context
- **Investment product catalogue** with risk-based recommendations
- **CORS support** for frontend integration

## Setup Instructions

### Prerequisites

- **Python 3.10+**
- **[uv](https://docs.astral.sh/uv/)** — fast Python package manager
- Azure AI Projects account and credentials (optional — mock mode works without)

### Installation

1. **Install uv** (if not already installed):
   ```bash
   # Windows (PowerShell)
   powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"

   # macOS/Linux
   curl -LsSf https://astral.sh/uv/install.sh | sh
   ```

2. **Navigate to backend and install dependencies:**
   ```bash
   cd backend
   uv sync
   ```

   To include evaluation tools:
   ```bash
   uv sync --extra eval
   ```

   To include dev tools (pytest, ruff, httpx):
   ```bash
   uv sync --dev
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your Azure credentials:
   - `PROJECT_ENDPOINT`: Your Azure AI Projects endpoint
   - `MODEL_DEPLOYMENT_NAME`: Your deployed model name (e.g., gpt-4)
   - Azure authentication credentials

### Running the Server

1. **Start the development server:**
   ```bash
   uv run python main.py
   ```

   Or using uvicorn directly:
   ```bash
   uv run uvicorn main:app --reload --host 0.0.0.0 --port 8172
   ```

2. **Access the API:**
   - API: http://localhost:8172
   - Interactive docs: http://localhost:8172/docs
   - OpenAPI schema: http://localhost:8172/openapi.json

### Running Tests

```bash
uv run pytest tests/ -v
```

## API Endpoints

### Core Endpoints

- `GET /` - API status and information
- `GET /health` - Health check with agent status
- `POST /chat` - Main chat interface for retirement planning
- `GET /scenarios` - Get predefined quick scenario questions
- `POST /analyze` - Analyze specific retirement scenarios

### Chat Endpoint Usage

```bash
curl -X POST "http://localhost:8172/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Should I increase my savings rate by 5%?",
    "profile": {
      "name": "John Doe",
      "age": 35,
      "current_cash": 50000,
      "investment_assets": 200000,
      "yearly_savings_rate": 0.15,
      "salary": 80000,
      "portfolio": {"stocks": 0.7, "bonds": 0.3},
      "risk_appetite": "medium",
      "target_retire_age": 65,
      "target_monthly_income": 4000
    }
  }'
```

## Data Models

### Scenario Model
- User profile with financial information
- Risk appetite and retirement goals
- Current portfolio allocation

### Analysis Output
- Retirement projections and success rates
- Product recommendations with allocations
- Cash flow projections
- Follow-up questions and alternatives

## Azure AI Integration

The backend uses Azure AI Projects for:
- **Intelligent analysis** of retirement scenarios
- **Code interpretation** for financial calculations
- **Function calling** for product catalogue queries
- **Conversational context** through thread management

## Development

### Project Structure
```
backend/
├── main.py              # FastAPI application
├── pyproject.toml       # Python dependencies (uv)
├── tests/
│   └── test_regression.py  # Regression tests
├── data/
│   ├── user_profiles.json
│   └── investment_products.json
├── sample/
│   └── agent-eval.ipynb
└── README.md            # This file
```

### Adding Dependencies

```bash
uv add <package-name>          # Add a runtime dependency
uv add --dev <package-name>    # Add a dev dependency
uv add --optional eval <pkg>   # Add to eval extras
```

### Adding New Features

1. **New endpoints**: Add to `main.py` with proper Pydantic models
2. **New AI functions**: Add to `user_functions` dictionary
3. **New data models**: Define using Pydantic BaseModel classes

### Testing

```bash
uv run pytest tests/ -v                # All tests
uv run pytest tests/test_regression.py  # Regression only
```

## Deployment

For production deployment:

1. **Set production environment variables**
2. **Use a production WSGI server** like Gunicorn
3. **Configure proper CORS origins** instead of allowing all
4. **Set up logging and monitoring**
5. **Use Azure App Service or similar platform**

## Troubleshooting

### Common Issues

1. **Azure authentication errors**: Verify credentials and permissions
2. **Model deployment issues**: Check model name and availability
3. **CORS errors**: Ensure frontend origin is allowed
4. **Import errors**: Run `uv sync` to ensure all dependencies are installed

### Logs and Debugging

- Enable debug logging by setting log level
- Check Azure AI Projects service status
- Verify network connectivity to Azure endpoints
