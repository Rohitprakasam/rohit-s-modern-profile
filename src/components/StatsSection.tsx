import { usePortfolioData } from "@/hooks/usePortfolioData";

const StatsSection = () => {
  const { projects = [], experience = [] } = usePortfolioData();

  // Calculate dynamic stats
  const projectCount = projects.length;
  // Calculate experience? Or just use length of items?
  const experienceCount = experience.length;
  // "Happy Clients" is subjective, maybe hardcode or store in profile meta?
  // For now let's keep hardcoded or derive if we had client data.
  // We'll stick to dynamic Projects and Experience count.

  const stats = [
    { value: experienceCount > 0 ? `${experienceCount}+` : "Fresher", label: "Experience" },
    { value: `${projectCount}+`, label: "Projects done" },
    { value: "3+", label: "Happy Clients" }, // Keep static or add to DB later
  ];

  return (
    <section className="py-8 bg-card border-t border-b border-border">
      <div className="container mx-auto px-6">
        <div className="flex flex-wrap justify-center divide-x divide-border">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="text-center px-8 md:px-16 py-4"
            >
              <div className="text-3xl md:text-4xl font-bold text-primary mb-1">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
