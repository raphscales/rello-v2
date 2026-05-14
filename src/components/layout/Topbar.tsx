"use client";

type TopbarProps = {
  title: string;
  businessName?: string;
};

export function Topbar({ title, businessName }: TopbarProps) {
  return (
    <header className="h-14 bg-white border-b border-[#E5E7EB] px-6 flex items-center justify-between flex-shrink-0">
      <h1 className="text-sm font-semibold text-[#111827]">{title}</h1>
      {businessName && (
        <span className="text-sm text-[#6B7280] font-medium">{businessName}</span>
      )}
    </header>
  );
}
