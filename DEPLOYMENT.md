# Azure Deployment Guide

Deploy JobTracker to Azure with Infrastructure as Code (Bicep).

**Estimated cost:** $26-41/month

- Static Web Apps: FREE
- Container Instances: $10-15/mo
- PostgreSQL Flexible (1 vCore): $15-25/mo

---

## Prerequisites

- Azure CLI: `az --version`
- Docker Desktop
- GitHub account (for Static Web Apps)
- GitHub Personal Access Token (PAT) with `repo` scope

---

## Quick Deploy

### 1. Set environment variables

```bash
export ENVIRONMENT=dev              # dev or prod
export LOCATION=westus              # Azure region
export GITHUB_REPO=https://github.com/YOUR_USER/JobTracker
export GITHUB_TOKEN=ghp_xxxxx       # GitHub Personal Access Token
```

### 2. Login to Azure

```bash
az login
az account set --subscription <your-subscription-id>
```

### 3. Run deployment script

```bash
chmod +x deploy.sh
./deploy.sh $ENVIRONMENT $LOCATION
```

The script will:

1. Create resource group
2. Build Docker image
3. Push to Container Registry
4. Deploy infrastructure (Bicep)

**Output:** Deployment outputs with URLs and connection strings

---

## Manual Deployment Steps

### Step 1: Create Resource Group

```bash
ENVIRONMENT=dev
LOCATION=westus
RESOURCE_GROUP=jobtracker-${ENVIRONMENT}

az group create --name $RESOURCE_GROUP --location $LOCATION
```

### Step 2: Deploy Infrastructure

```bash
DB_PASSWORD=$(openssl rand -base64 32)

az deployment group create \
  --resource-group $RESOURCE_GROUP \
  --template-file deploy.bicep \
  --parameters \
    location=$LOCATION \
    environment=$ENVIRONMENT \
    projectName=jobtracker \
    dbAdminPassword=$DB_PASSWORD \
    githubRepo=$GITHUB_REPO \
    githubToken=$GITHUB_TOKEN

# Save password
echo "DB_PASSWORD=${DB_PASSWORD}" > .env.${ENVIRONMENT}
```

### Step 3: Build & Push Docker Image

```bash
# Get registry name
REGISTRY_NAME=jobtracker${ENVIRONMENT}acr
REGISTRY_LOGIN_SERVER=$(az acr show --name $REGISTRY_NAME \
  --resource-group $RESOURCE_GROUP --query loginServer -o tsv)

# Login and build
az acr login --name $REGISTRY_NAME

docker build -t ${REGISTRY_LOGIN_SERVER}/jobtracker-api:latest \
  -f src/JobTracker.Api/Dockerfile .

docker push ${REGISTRY_LOGIN_SERVER}/jobtracker-api:latest
```

### Step 4: Verify Deployment

```bash
# Check backend
az container logs --resource-group $RESOURCE_GROUP \
  --name jobtracker-${ENVIRONMENT}-api

# Get frontend URL
az staticwebapp list --resource-group $RESOURCE_GROUP \
  --query "[0].{name:name, url:defaultHostname}" -o table

# Get backend IP
az container show --resource-group $RESOURCE_GROUP \
  --name jobtracker-${ENVIRONMENT}-api \
  --query ipAddress.fqdn -o tsv
```

---

## Testing the Deployment

### Test Backend

```bash
# Get backend URL
BACKEND_URL=$(az container show --resource-group $RESOURCE_GROUP \
  --name jobtracker-${ENVIRONMENT}-api --query ipAddress.fqdn -o tsv)

# Test health
curl http://${BACKEND_URL}:5000/health
```

### Test Database Connection

```bash
# Get database details
POSTGRES_FQDN=$(az postgres flexible-server show \
  --resource-group $RESOURCE_GROUP \
  --name jobtracker-${ENVIRONMENT}-db-* \
  --query fullyQualifiedDomainName -o tsv)

# Connect (requires psql client)
psql -h $POSTGRES_FQDN -U dbadmin -d jobtracker
```

### Test Frontend

Visit the Static Web App URL from deployment outputs.

---

## Monitoring & Logs

### Backend Logs

```bash
az container logs --resource-group $RESOURCE_GROUP \
  --name jobtracker-${ENVIRONMENT}-api --follow
```

### Database Logs

```bash
az postgres flexible-server parameter set \
  --resource-group $RESOURCE_GROUP \
  --server-name jobtracker-${ENVIRONMENT}-db-* \
  --name log_statement \
  --value 'all'
```

### Static Web App Logs

```bash
# View deployment logs
az staticwebapp show --resource-group $RESOURCE_GROUP \
  --name jobtracker-${ENVIRONMENT}
```

---

## Configuration

### Backend Environment Variables

Update in `deploy.bicep` under `containerInstance` → `environmentVariables`:

```bicep
{
  name: 'YOUR_VAR'
  value: 'your-value'
}

// Or for secrets:
{
  name: 'YOUR_SECRET'
  secureValue: 'your-secret-value'
}
```

### Database Configuration

Modify PostgreSQL properties in `deploy.bicep`:

```bicep
sku: {
  name: 'Standard_B1ms'    // Change tier
  tier: 'Burstable'
}
storage: {
  storageSizeGB: 32        // Increase storage
}
```

### Static Web App Settings

Update `deploy.bicep` buildProperties:

```bicep
buildProperties: {
  appLocation: 'frontend'
  outputLocation: 'dist'
  apiLocation: ''          // Or point to API backend
}
```

---

## Scaling

### Increase Backend Resources

Change Container Instances CPU/memory:

```bicep
resources: {
  requests: {
    cpu: 2                 // Increase from 1
    memoryInGb: 2
  }
}
```

### Upgrade Database

```bash
az postgres flexible-server update \
  --resource-group $RESOURCE_GROUP \
  --name jobtracker-${ENVIRONMENT}-db-* \
  --sku-name Standard_D2s_v3 \
  --tier GeneralPurpose
```

---

## Cleanup

### Delete entire deployment

```bash
az group delete --name $RESOURCE_GROUP --yes
```

### Delete specific resources

```bash
# Delete container instance
az container delete --resource-group $RESOURCE_GROUP \
  --name jobtracker-${ENVIRONMENT}-api

# Delete database
az postgres flexible-server delete --resource-group $RESOURCE_GROUP \
  --name jobtracker-${ENVIRONMENT}-db-* --yes
```

---

## Troubleshooting

### Backend won't start

```bash
# Check logs
az container logs --resource-group $RESOURCE_GROUP \
  --name jobtracker-${ENVIRONMENT}-api

# Check image exists in registry
az acr repository list --name jobtracker${ENVIRONMENT}acr

# Check credentials
az acr credential show --name jobtracker${ENVIRONMENT}acr
```

### Database connection fails

```bash
# Verify firewall rules
az postgres flexible-server firewall-rule list \
  --resource-group $RESOURCE_GROUP \
  --server-name jobtracker-${ENVIRONMENT}-db-*

# Check database exists
az postgres flexible-server db list \
  --resource-group $RESOURCE_GROUP \
  --server-name jobtracker-${ENVIRONMENT}-db-*
```

### Frontend deployment fails

1. Check GitHub token has `repo` scope
2. Check repository URL is correct
3. Check branch exists (`main`)
4. Review Static Web App deployment logs in Azure Portal

---

## Cost Optimization

### Development Environment

- Use Free tier for Static Web Apps
- Use Burstable tier for PostgreSQL
- Container Instances: ~$10/month (stops when idle)

### Production Environment

- Consider App Service instead of Container Instances for reliability
- Use Standard PostgreSQL tier for HA
- Enable geo-replication for redundancy

---

## CI/CD with GitHub Actions

The deployment can be automated with GitHub Actions:

```yaml
name: Deploy to Azure

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Azure Login
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Build & Deploy
        run: |
          export GITHUB_TOKEN=${{ secrets.GITHUB_TOKEN }}
          ./deploy.sh prod westus
```

---

## Support

For issues:

1. Check logs: `az container logs --resource-group ... --name ... --follow`
2. Verify resources exist: `az resource list --resource-group ...`
3. Check Azure Portal for detailed error messages
4. Review Bicep syntax: https://learn.microsoft.com/azure/azure-resource-manager/bicep/
