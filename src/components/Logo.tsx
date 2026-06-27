const Logo = ({ size = 36, className = "" }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`transition-transform duration-300 hover:rotate-[15deg] hover:scale-110 ${className}`}
  >
    <defs>
      <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="hsl(174, 72%, 46%)" />
        <stop offset="100%" stopColor="hsl(270, 60%, 60%)" />
      </linearGradient>
      <linearGradient id="logo-grad-light" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="hsl(174, 72%, 46%)" stopOpacity="0.3" />
        <stop offset="100%" stopColor="hsl(270, 60%, 60%)" stopOpacity="0.3" />
      </linearGradient>
    </defs>
    {/* Background circle */}
    <circle cx="24" cy="24" r="22" fill="url(#logo-grad)" />
    {/* Inner connecting nodes — S shape */}
    <path
      d="M18 14C18 14 30 14 30 20C30 26 18 24 18 30C18 36 30 34 30 34"
      stroke="white"
      strokeWidth="3.5"
      strokeLinecap="round"
      fill="none"
    />
    {/* Node dots */}
    <circle cx="16" cy="14" r="3" fill="white" />
    <circle cx="32" cy="34" r="3" fill="white" />
    {/* Small connecting dots */}
    <circle cx="32" cy="20" r="2" fill="white" fillOpacity="0.7" />
    <circle cx="16" cy="30" r="2" fill="white" fillOpacity="0.7" />
  </svg>
);

export default Logo;
