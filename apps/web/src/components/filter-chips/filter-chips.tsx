'use client';

interface FilterOption {
  label: string;
  value: string;
}

interface FilterChipsProps {
  options: FilterOption[];
  selected: string[];
  onToggle: (value: string) => void;
}

export function FilterChips({ options, selected, onToggle }: FilterChipsProps) {
  return (
    <div className="flex gap-2 flex-wrap mb-4">
      {options.map((option) => {
        const isSelected = selected.includes(option.value);
        return (
          <button
            key={option.value}
            onClick={() => onToggle(option.value)}
            className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
              isSelected
                ? 'bg-crate-accent text-white'
                : 'bg-crate-surface border border-crate-border text-crate-muted hover:text-crate-text'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
