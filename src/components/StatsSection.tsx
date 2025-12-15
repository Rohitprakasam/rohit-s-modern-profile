const stats = [
  { value: "Fresher", label: "Experience" },
  { value: "5+", label: "Projects done" },
  { value: "3+", label: "Happy Clients" },
];

const StatsSection = () => {
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
