using JobTracker.Api.Data;
using JobTracker.Api.Services;
using Microsoft.EntityFrameworkCore;

const string FrontendCorsPolicy = "AllowFrontend";

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddGrpc();

builder.Services.AddDbContext<JobTrackerDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("JobTracker")));

builder.Services.AddCors(options =>
    options.AddPolicy(FrontendCorsPolicy, policy => policy
        .WithOrigins(builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
                     ?? ["http://localhost:5173"])
        .AllowAnyHeader()
        .AllowAnyMethod()
        // Required so the browser can read gRPC-Web trailers.
        .WithExposedHeaders("Grpc-Status", "Grpc-Message", "Grpc-Encoding", "Grpc-Accept-Encoding")));

var app = builder.Build();

// Apply pending EF Core migrations automatically in development.
if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<JobTrackerDbContext>();
    db.Database.Migrate();
}

app.UseCors(FrontendCorsPolicy);

// gRPC-Web lets the browser (Connect-ES client) talk to this service over HTTP/1.1.
app.UseGrpcWeb(new GrpcWebOptions { DefaultEnabled = true });

app.MapGrpcService<JobApplicationGrpcService>().RequireCors(FrontendCorsPolicy);

app.MapGet("/", () =>
    "JobTracker gRPC service is running. Connect with a gRPC or gRPC-Web client.");

app.Run();
