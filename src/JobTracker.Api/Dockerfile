# Multi-stage build for .NET API
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS builder

WORKDIR /src

# Copy the solution and project files
COPY ["JobTracker.sln", "./"]
COPY ["src/JobTracker.Api/JobTracker.Api.csproj", "src/JobTracker.Api/"]

# Restore dependencies
RUN dotnet restore "JobTracker.sln"

# Copy the entire source
COPY . .

# Build the project
RUN dotnet build "src/JobTracker.Api/JobTracker.Api.csproj" -c Release -o /app/build

# Publish the project
RUN dotnet publish "src/JobTracker.Api/JobTracker.Api.csproj" -c Release -o /app/publish

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine

WORKDIR /app

# Copy published application from builder
COPY --from=builder /app/publish .

# Set environment to Development to enable automatic migrations
ENV ASPNETCORE_ENVIRONMENT=Development
ENV ASPNETCORE_URLS=http://+:5000

# Expose port 5000
EXPOSE 5000

# Start the application
ENTRYPOINT ["dotnet", "JobTracker.Api.dll"]
