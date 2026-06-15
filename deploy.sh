#!/bin/bash
set -e

# ============================================================================
# JobTracker Azure Deployment Script
# ============================================================================

echo "🚀 JobTracker Azure Deployment"
echo "=============================="

# Configuration
ENVIRONMENT=${1:-dev}
LOCATION=${2:-westus}
RESOURCE_GROUP="jobtracker-${ENVIRONMENT}"
PROJECT_NAME="jobtracker"

echo "Environment: $ENVIRONMENT"
echo "Location: $LOCATION"
echo "Resource Group: $RESOURCE_GROUP"

# ============================================================================
# 1. CREATE RESOURCE GROUP
# ============================================================================
echo ""
echo "📦 Creating resource group..."
az group create \
  --name "$RESOURCE_GROUP" \
  --location "$LOCATION"

# ============================================================================
# 2. BUILD AND PUSH DOCKER IMAGE
# ============================================================================
echo ""
echo "🐳 Building Docker image..."

# Get container registry name from deployment
REGISTRY_NAME="${PROJECT_NAME}${ENVIRONMENT}acr"
REGISTRY_LOGIN_SERVER=$(az acr show --name "$REGISTRY_NAME" --resource-group "$RESOURCE_GROUP" --query loginServer -o tsv 2>/dev/null || echo "")

if [ -z "$REGISTRY_LOGIN_SERVER" ]; then
  echo "⚠️  Container registry not yet deployed. Deploy infrastructure first."
  exit 1
fi

echo "Registry: $REGISTRY_LOGIN_SERVER"

# Login to Azure Container Registry
az acr login --name "$REGISTRY_NAME"

# Build and push
docker build -t "$REGISTRY_LOGIN_SERVER/${PROJECT_NAME}-api:latest" \
  -f src/JobTracker.Api/Dockerfile .

docker push "$REGISTRY_LOGIN_SERVER/${PROJECT_NAME}-api:latest"

echo "✅ Docker image pushed: $REGISTRY_LOGIN_SERVER/${PROJECT_NAME}-api:latest"

# ============================================================================
# 3. DEPLOY INFRASTRUCTURE
# ============================================================================
echo ""
echo "🏗️  Deploying infrastructure with Bicep..."

# Generate random DB password
DB_PASSWORD=$(openssl rand -base64 32)

echo "Database admin password saved to: .env.${ENVIRONMENT}"
echo "DB_PASSWORD=${DB_PASSWORD}" > ".env.${ENVIRONMENT}"

# Deploy
az deployment group create \
  --name "jobtracker-${ENVIRONMENT}-$(date +%s)" \
  --resource-group "$RESOURCE_GROUP" \
  --template-file deploy.bicep \
  --parameters \
    location="$LOCATION" \
    environment="$ENVIRONMENT" \
    projectName="$PROJECT_NAME" \
    dbAdminPassword="$DB_PASSWORD" \
    githubRepo="${GITHUB_REPO:-}" \
    githubToken="${GITHUB_TOKEN:-}"

# ============================================================================
# 4. GET OUTPUTS
# ============================================================================
echo ""
echo "✅ Deployment complete!"
echo ""

DEPLOYMENT_NAME=$(az deployment group list --resource-group "$RESOURCE_GROUP" --query "[0].name" -o tsv)

echo "📋 Deployment Outputs:"
az deployment group show \
  --name "$DEPLOYMENT_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query properties.outputs \
  -o table

echo ""
echo "🎯 Next steps:"
echo "1. Monitor backend: az container logs --resource-group $RESOURCE_GROUP --name jobtracker-${ENVIRONMENT}-api --follow"
echo "2. Check database: psql -h <postgres-fqdn> -U dbadmin -d jobtracker"
echo "3. View frontend: Check Static Web App deployment in Azure Portal"
echo ""
echo "💰 Estimated cost: \$26-41/month"
