interface TabBarProps {
  tabs: string[];
  active: string;
  onChange: (tab: string) => void;
}

const TabBar = ({ tabs, active, onChange }: TabBarProps) => (
  <div className="flex overflow-x-auto no-scrollbar border rounded-lg bg-secondary/50">
    {tabs.map((tab) => (
      <button
        key={tab}
        onClick={() => onChange(tab)}
        className={`flex-shrink-0 flex-1 min-w-fit px-4 py-2.5 text-sm font-medium transition-all whitespace-nowrap ${
          active === tab
            ? "bg-card border border-primary text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        {tab}
      </button>
    ))}
  </div>
);

export default TabBar;