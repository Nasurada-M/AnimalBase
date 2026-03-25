import type { KeyboardEvent } from 'react';
import { Search, X } from 'lucide-react';

type ClearableSearchFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  onClear?: () => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  containerClassName?: string;
  inputClassName?: string;
  iconClassName?: string;
  clearLabel?: string;
};

export default function ClearableSearchField({
  value,
  onChange,
  placeholder,
  onClear,
  onKeyDown,
  containerClassName = '',
  inputClassName = '',
  iconClassName = 'text-primary-400',
  clearLabel = 'Clear search',
}: ClearableSearchFieldProps) {
  const showClear = value.length > 0;

  const handleClear = () => {
    onChange('');
    onClear?.();
  };

  return (
    <div className={`relative ${containerClassName}`.trim()}>
      <Search
        className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 sm:left-4 ${iconClassName}`.trim()}
      />
      <input
        className={`input-field pl-11 pr-11 sm:pl-12 ${inputClassName}`.trim()}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
      />
      {showClear && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full border border-transparent p-1 text-gray-300 transition-colors hover:border-primary-100 hover:bg-primary-50 hover:text-primary-500"
          aria-label={clearLabel}
          title={clearLabel}
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
