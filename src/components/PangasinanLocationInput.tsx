import { useEffect, useRef, useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';
import { ApiLocationSuggestion, locationApi } from '../services/api';

type PangasinanLocationInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  maxLength?: number;
  inputClassName?: string;
  helperText?: string;
  inputId?: string;
};

export default function PangasinanLocationInput({
  value,
  onChange,
  placeholder = 'Search Pangasinan barangay, city, or municipality',
  disabled = false,
  required = false,
  maxLength = 255,
  inputClassName = 'input-field',
  helperText = 'Suggestions are limited to cities, municipalities, and barangays in Pangasinan.',
  inputId,
}: PangasinanLocationInputProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const requestIdRef = useRef(0);

  const [isFocused, setIsFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<ApiLocationSuggestion[]>([]);

  useEffect(() => {
    if (disabled) {
      setSuggestions([]);
      setIsLoading(false);
      return undefined;
    }

    const trimmedValue = value.trim();
    if (trimmedValue.length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      return undefined;
    }

    const currentRequestId = requestIdRef.current + 1;
    requestIdRef.current = currentRequestId;

    const timeoutId = window.setTimeout(async () => {
      setIsLoading(true);

      try {
        const nextSuggestions = await locationApi.searchPangasinan(trimmedValue);
        if (requestIdRef.current === currentRequestId) {
          setSuggestions(nextSuggestions);
        }
      } catch {
        if (requestIdRef.current === currentRequestId) {
          setSuggestions([]);
        }
      } finally {
        if (requestIdRef.current === currentRequestId) {
          setIsLoading(false);
        }
      }
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [disabled, value]);

  useEffect(() => {
    if (!isFocused) return undefined;

    const handlePointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [isFocused]);

  const showSuggestions = isFocused && value.trim().length >= 2;

  return (
    <div ref={wrapperRef} className="relative">
      <input
        id={inputId}
        type="text"
        className={inputClassName}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setIsFocused(true)}
        disabled={disabled}
        required={required}
        maxLength={maxLength}
        autoComplete="off"
      />

      {showSuggestions && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.4rem)] z-30 overflow-hidden rounded-2xl border border-primary-100 bg-white shadow-xl shadow-primary-900/10">
          {isLoading ? (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-primary-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading Pangasinan locations...
            </div>
          ) : suggestions.length > 0 ? (
            <div className="max-h-64 overflow-y-auto py-1">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.label}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onChange(suggestion.label);
                    setIsFocused(false);
                  }}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-primary-50"
                >
                  <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-500" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800">{suggestion.label}</p>
                    {suggestion.kind && (
                      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-primary-500">
                        {suggestion.kind}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="px-4 py-3 text-sm text-gray-500">
              No Pangasinan matches found. Try a barangay, city, or municipality.
            </div>
          )}
        </div>
      )}

      {helperText && (
        <p className="mt-2 text-xs text-gray-500">{helperText}</p>
      )}
    </div>
  );
}
