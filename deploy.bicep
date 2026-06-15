param location string = resourceGroup().location
param environment string = 'dev'
param projectName string = 'jobtracker'

// Resource naming
var uniqueSuffix = uniqueString(resourceGroup().id)
var appName = '${projectName}-${environment}'
var containerRegistryName = '${projectName}${environment}acr'
var postgresServerName = '${projectName}-${environment}-db-${uniqueSuffix}'
var containerGroupName = '${projectName}-${environment}-api'
var storageAccountName = '${projectName}${environment}storage'

// Database admin
param dbAdminUsername string = 'dbadmin'
@secure()
param dbAdminPassword string

// GitHub repo (for Static Web Apps)
param githubRepo string
param githubToken string

// ============================================================================
// 1. CONTAINER REGISTRY
// ============================================================================
resource containerRegistry 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: containerRegistryName
  location: location
  properties: {
    adminUserEnabled: true
    publicNetworkAccess: 'Enabled'
    networkRuleBypassOptions: 'AzureServices'
    policies: {
      quarantinePolicy: {
        status: 'disabled'
      }
      trustPolicy: {
        type: 'Notary'
        status: 'disabled'
      }
      retentionPolicy: {
        days: 30
        status: 'enabled'
      }
    }
  }
  sku: {
    name: 'Basic'
  }
}

// ============================================================================
// 2. POSTGRESQL FLEXIBLE SERVER
// ============================================================================
resource postgresServer 'Microsoft.DBforPostgreSQL/flexibleServers@2023-12-01-preview' = {
  name: postgresServerName
  location: location
  sku: {
    name: 'Standard_B1ms'
    tier: 'Burstable'
  }
  properties: {
    administratorLogin: dbAdminUsername
    administratorLoginPassword: dbAdminPassword
    version: '15'
    storage: {
      storageSizeGB: 32
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    network: {
      delegatedSubnetResourceId: ''
      publicNetworkAccess: 'Enabled'
    }
    highAvailability: {
      mode: 'Disabled'
    }
    maintenanceWindow: {
      customWindow: 'Disabled'
      dayOfWeek: 0
      startHour: 0
      startMinute: 0
    }
  }
}

// PostgreSQL Database
resource jobTrackerDb 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-12-01-preview' = {
  parent: postgresServer
  name: projectName
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
}

// Firewall rule to allow all Azure services
resource postgresAllowAzureServices 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2023-12-01-preview' = {
  parent: postgresServer
  name: 'AllowAllAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '255.255.255.255'
  }
}

// ============================================================================
// 3. CONTAINER INSTANCES
// ============================================================================
resource containerInstance 'Microsoft.ContainerInstance/containerGroups@2023-05-01' = {
  name: containerGroupName
  location: location
  properties: {
    containers: [
      {
        name: 'api'
        properties: {
          image: '${containerRegistry.properties.loginServer}/${projectName}-api:latest'
          resources: {
            requests: {
              cpu: 1
              memoryInGb: 1
            }
          }
          ports: [
            {
              port: 5000
              protocol: 'TCP'
            }
          ]
          environmentVariables: [
            {
              name: 'ASPNETCORE_ENVIRONMENT'
              value: environment == 'prod' ? 'Production' : 'Development'
            }
            {
              name: 'ConnectionStrings__JobTracker'
              secureValue: 'Host=${postgresServer.properties.fullyQualifiedDomainName};Port=5432;Database=${projectName};Username=${dbAdminUsername};Password=${dbAdminPassword};SslMode=Require;'
            }
            {
              name: 'Cors__AllowedOrigins__0'
              value: 'https://${staticWebApp.properties.defaultHostname}'
            }
          ]
        }
      }
    ]
    osType: 'Linux'
    restartPolicy: 'OnFailure'
    imageRegistryCredentials: [
      {
        server: containerRegistry.properties.loginServer
        username: containerRegistry.listCredentials().username
        password: containerRegistry.listCredentials().passwords[0].value
      }
    ]
    ipAddress: {
      type: 'Public'
      ports: [
        {
          port: 5000
          protocol: 'TCP'
        }
      ]
      dnsNameLabel: containerGroupName
    }
  }
}

// ============================================================================
// 4. STATIC WEB APP (FRONTEND)
// ============================================================================
resource staticWebApp 'Microsoft.Web/staticSites@2023-01-01' = {
  name: appName
  location: location
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {
    repositoryUrl: githubRepo
    branch: 'main'
    repositoryToken: githubToken
    buildProperties: {
      appLocation: 'frontend'
      outputLocation: 'dist'
      apiLocation: ''
    }
  }
}

// Static Web App API settings (proxy to backend)
resource staticWebAppApiConfig 'Microsoft.Web/staticSites/config@2023-01-01' = {
  parent: staticWebApp
  name: 'appsettings'
  properties: {
    functionAppContentShareName: 'api'
    apiDefinition: {
      url: 'https://${containerInstance.properties.ipAddress.fqdn}:5000/swagger/v1/swagger.json'
    }
  }
}

// ============================================================================
// OUTPUTS
// ============================================================================
output containerRegistryLoginServer string = containerRegistry.properties.loginServer
output containerRegistryName string = containerRegistry.name
output postgresServerFqdn string = postgresServer.properties.fullyQualifiedDomainName
output postgresServerName string = postgresServer.name
output backendUrl string = 'http://${containerInstance.properties.ipAddress.fqdn}:5000'
output frontendUrl string = 'https://${staticWebApp.properties.defaultHostname}'
output containerGroupName string = containerGroupName
output containerInstanceIp string = containerInstance.properties.ipAddress.ip
