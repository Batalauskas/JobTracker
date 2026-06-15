using Google.Protobuf.WellKnownTypes;
using Entity = JobTracker.Api.Models.JobApplication;
using EntityStatus = JobTracker.Api.Models.ApplicationStatus;
using Proto = JobTracker.Api.Grpc;

namespace JobTracker.Api.Mapping;

public static class ProtoMapper
{
    public static Proto.JobApplication ToProto(this Entity entity) => new()
    {
        Id = entity.Id.ToString(),
        CompanyName = entity.CompanyName,
        Position = entity.Position,
        Location = entity.Location,
        SalaryMin = entity.SalaryMin ?? 0,
        SalaryMax = entity.SalaryMax ?? 0,
        Status = entity.Status.ToProto(),
        Source = entity.Source,
        JobUrl = entity.JobUrl,
        ContactPerson = entity.ContactPerson,
        Notes = entity.Notes,
        AppliedAt = entity.AppliedAt.ToTimestampOrNull(),
        CreatedAt = entity.CreatedAt.ToUtcTimestamp(),
        UpdatedAt = entity.UpdatedAt.ToUtcTimestamp()
    };

    public static Proto.ApplicationStatus ToProto(this EntityStatus status) => status switch
    {
        EntityStatus.Draft => Proto.ApplicationStatus.Draft,
        EntityStatus.Applied => Proto.ApplicationStatus.Applied,
        EntityStatus.Interview => Proto.ApplicationStatus.Interview,
        EntityStatus.Offer => Proto.ApplicationStatus.Offer,
        EntityStatus.Rejected => Proto.ApplicationStatus.Rejected,
        EntityStatus.Withdrawn => Proto.ApplicationStatus.Withdrawn,
        _ => Proto.ApplicationStatus.Unspecified
    };

    public static EntityStatus ToEntity(this Proto.ApplicationStatus status) => status switch
    {
        Proto.ApplicationStatus.Draft => EntityStatus.Draft,
        Proto.ApplicationStatus.Applied => EntityStatus.Applied,
        Proto.ApplicationStatus.Interview => EntityStatus.Interview,
        Proto.ApplicationStatus.Offer => EntityStatus.Offer,
        Proto.ApplicationStatus.Rejected => EntityStatus.Rejected,
        Proto.ApplicationStatus.Withdrawn => EntityStatus.Withdrawn,
        // Treat "unspecified" on writes as a sensible default.
        _ => EntityStatus.Applied
    };

    public static Timestamp ToUtcTimestamp(this DateTime value) =>
        Timestamp.FromDateTime(DateTime.SpecifyKind(value, DateTimeKind.Utc));

    public static Timestamp? ToTimestampOrNull(this DateTime? value) =>
        value.HasValue ? value.Value.ToUtcTimestamp() : null;
}
