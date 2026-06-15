using Google.Protobuf.WellKnownTypes;
using Grpc.Core;
using JobTracker.Api.Data;
using JobTracker.Api.Grpc;
using JobTracker.Api.Mapping;
using Microsoft.EntityFrameworkCore;
using Entity = JobTracker.Api.Models.JobApplication;
using EntityStatus = JobTracker.Api.Models.ApplicationStatus;

namespace JobTracker.Api.Services;

public class JobApplicationGrpcService(JobTrackerDbContext db)
    : JobApplicationService.JobApplicationServiceBase
{
    public override async Task<JobApplication> CreateApplication(
        CreateApplicationRequest request, ServerCallContext context)
    {
        if (string.IsNullOrWhiteSpace(request.CompanyName))
            throw new RpcException(new Status(StatusCode.InvalidArgument, "Company name is required."));
        if (string.IsNullOrWhiteSpace(request.Position))
            throw new RpcException(new Status(StatusCode.InvalidArgument, "Position is required."));

        var now = DateTime.UtcNow;
        var entity = new Entity
        {
            Id = Guid.NewGuid(),
            CompanyName = request.CompanyName.Trim(),
            Position = request.Position.Trim(),
            Location = request.Location.Trim(),
            SalaryMin = request.SalaryMin > 0 ? request.SalaryMin : null,
            SalaryMax = request.SalaryMax > 0 ? request.SalaryMax : null,
            Status = request.Status.ToEntity(),
            Source = request.Source.Trim(),
            JobUrl = request.JobUrl.Trim(),
            ContactPerson = request.ContactPerson.Trim(),
            Notes = request.Notes,
            AppliedAt = request.AppliedAt?.ToDateTime(),
            CreatedAt = now,
            UpdatedAt = now
        };

        db.Applications.Add(entity);
        await db.SaveChangesAsync(context.CancellationToken);

        return entity.ToProto();
    }

    public override async Task<JobApplication> GetApplication(
        GetApplicationRequest request, ServerCallContext context)
    {
        var entity = await FindOrThrowAsync(request.Id, context);
        return entity.ToProto();
    }

    public override async Task<ListApplicationsResponse> ListApplications(
        ListApplicationsRequest request, ServerCallContext context)
    {
        IQueryable<Entity> query = db.Applications.AsNoTracking();

        if (request.StatusFilter != ApplicationStatus.Unspecified)
        {
            var status = request.StatusFilter.ToEntity();
            query = query.Where(a => a.Status == status);
        }

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var pattern = $"%{request.Search.Trim()}%";
            query = query.Where(a =>
                EF.Functions.ILike(a.CompanyName, pattern) ||
                EF.Functions.ILike(a.Position, pattern) ||
                EF.Functions.ILike(a.Location, pattern));
        }

        var entities = await query
            .OrderByDescending(a => a.AppliedAt ?? a.CreatedAt)
            .ThenByDescending(a => a.UpdatedAt)
            .ToListAsync(context.CancellationToken);

        var response = new ListApplicationsResponse();
        response.Applications.AddRange(entities.Select(e => e.ToProto()));
        return response;
    }

    public override async Task<JobApplication> UpdateApplication(
        UpdateApplicationRequest request, ServerCallContext context)
    {
        var entity = await FindOrThrowAsync(request.Id, context);

        entity.CompanyName = request.CompanyName.Trim();
        entity.Position = request.Position.Trim();
        entity.Location = request.Location.Trim();
        entity.SalaryMin = request.SalaryMin > 0 ? request.SalaryMin : null;
        entity.SalaryMax = request.SalaryMax > 0 ? request.SalaryMax : null;
        entity.Status = request.Status.ToEntity();
        entity.Source = request.Source.Trim();
        entity.JobUrl = request.JobUrl.Trim();
        entity.ContactPerson = request.ContactPerson.Trim();
        entity.Notes = request.Notes;
        entity.AppliedAt = request.AppliedAt?.ToDateTime();
        entity.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(context.CancellationToken);
        return entity.ToProto();
    }

    public override async Task<JobApplication> UpdateStatus(
        UpdateStatusRequest request, ServerCallContext context)
    {
        if (request.Status == ApplicationStatus.Unspecified)
            throw new RpcException(new Status(StatusCode.InvalidArgument, "A concrete status is required."));

        var entity = await FindOrThrowAsync(request.Id, context);

        entity.Status = request.Status.ToEntity();
        entity.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(context.CancellationToken);
        return entity.ToProto();
    }

    public override async Task<Empty> DeleteApplication(
        DeleteApplicationRequest request, ServerCallContext context)
    {
        var entity = await FindOrThrowAsync(request.Id, context);

        db.Applications.Remove(entity);
        await db.SaveChangesAsync(context.CancellationToken);
        return new Empty();
    }

    public override async Task<DashboardStats> GetDashboardStats(
        Empty request, ServerCallContext context)
    {
        var counts = await db.Applications.AsNoTracking()
            .GroupBy(a => a.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync(context.CancellationToken);

        int CountOf(EntityStatus status) =>
            counts.FirstOrDefault(c => c.Status == status)?.Count ?? 0;

        var interviews = CountOf(EntityStatus.Interview);
        var offers = CountOf(EntityStatus.Offer);
        var rejected = CountOf(EntityStatus.Rejected);
        var submitted = counts.Where(c => c.Status != EntityStatus.Draft).Sum(c => c.Count);
        var responded = interviews + offers + rejected;

        var stats = new DashboardStats
        {
            Total = counts.Sum(c => c.Count),
            Active = CountOf(EntityStatus.Applied) + interviews + offers,
            Interviews = interviews,
            Offers = offers,
            Rejected = rejected,
            ResponseRate = submitted > 0 ? Math.Round(100.0 * responded / submitted, 1) : 0
        };

        // Fixed pipeline order so the client can render the funnel directly.
        EntityStatus[] pipelineOrder =
        [
            EntityStatus.Draft, EntityStatus.Applied, EntityStatus.Interview,
            EntityStatus.Offer, EntityStatus.Rejected, EntityStatus.Withdrawn
        ];

        foreach (var status in pipelineOrder)
        {
            stats.Pipeline.Add(new StatusCount
            {
                Status = status.ToProto(),
                Count = CountOf(status)
            });
        }

        return stats;
    }

    private async Task<Entity> FindOrThrowAsync(string id, ServerCallContext context)
    {
        if (!Guid.TryParse(id, out var guid))
            throw new RpcException(new Status(StatusCode.InvalidArgument, $"'{id}' is not a valid application id."));

        var entity = await db.Applications.FirstOrDefaultAsync(
            a => a.Id == guid, context.CancellationToken);

        return entity
            ?? throw new RpcException(new Status(StatusCode.NotFound, $"Application '{id}' was not found."));
    }
}
