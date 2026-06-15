namespace JobTracker.Api.Models;

public enum ApplicationStatus
{
    Draft = 1,
    Applied = 2,
    Interview = 3,
    Offer = 4,
    Rejected = 5,
    Withdrawn = 6
}

public class JobApplication
{
    public Guid Id { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public string Position { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;

    /// <summary>Annual salary range in EUR. Null = not known.</summary>
    public int? SalaryMin { get; set; }
    public int? SalaryMax { get; set; }

    public ApplicationStatus Status { get; set; } = ApplicationStatus.Applied;

    /// <summary>Where the position was found (LinkedIn, StepStone, referral, ...).</summary>
    public string Source { get; set; } = string.Empty;
    public string JobUrl { get; set; } = string.Empty;
    public string ContactPerson { get; set; } = string.Empty;
    public string Notes { get; set; } = string.Empty;

    public DateTime? AppliedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
