type LogoProps = {
  size?: number;
  className?: string;
  rounded?: boolean;
};

export default function Logo({ size = 32, className = '', rounded = true }: LogoProps) {
  return (
    <img
      src="/LockedIn-logo.svg"
      alt="LockedIn"
      width={size}
      height={size}
      className={`shrink-0 ${rounded ? 'rounded-md' : ''} ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
