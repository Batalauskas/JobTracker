using JobTracker.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace JobTracker.Api.Data;

public class JobTrackerDbContext(DbContextOptions<JobTrackerDbContext> options) : DbContext(options)
{
    public DbSet<JobApplication> Applications => Set<JobApplication>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<JobApplication>(entity =>
        {
            entity.ToTable("job_applications");

            entity.HasKey(a => a.Id);

            entity.Property(a => a.CompanyName).HasMaxLength(200).IsRequired();
            entity.Property(a => a.Position).HasMaxLength(200).IsRequired();
            entity.Property(a => a.Location).HasMaxLength(200);
            entity.Property(a => a.Source).HasMaxLength(100);
            entity.Property(a => a.JobUrl).HasMaxLength(2000);
            entity.Property(a => a.ContactPerson).HasMaxLength(200);

            // Stored as text so the table stays readable in psql / pgAdmin.
            entity.Property(a => a.Status)
                .HasConversion<string>()
                .HasMaxLength(20);

            entity.HasIndex(a => a.Status);
            entity.HasIndex(a => a.CompanyName);
        });
    }
}
