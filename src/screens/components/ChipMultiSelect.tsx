// ChipMultiSelect.tsx
//
// Reusable collapsible dropdown + chip-grid picker for multi-select string
// fields (food allergies, medical conditions, etc). Extracted from
// AddResidentModal so EditResident — and any future form — uses the
// identical UI/UX without code duplication.

import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

type Props = {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  /** Adds a red asterisk after the label and an error border when `error` is true. */
  required?: boolean;
  error?: boolean;
  /** Hint shown above the chips when the picker is open. */
  hint?: string;
  /** Start expanded? Defaults to false (collapsed). */
  defaultOpen?: boolean;
};

export default function ChipMultiSelect({
  label,
  options,
  selected,
  onChange,
  required = false,
  error = false,
  hint = 'Tap all that apply.',
  defaultOpen = false,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  const count = selected.length;
  const preview = count
    ? selected.slice(0, 3).join(', ') + (count > 3 ? `, +${count - 3} more` : '')
    : 'None selected';

  const toggle = (value: string) => {
    const exists = selected.some((s) => s.toLowerCase() === value.toLowerCase());
    const next = exists
      ? selected.filter((s) => s.toLowerCase() !== value.toLowerCase())
      : [...selected, value];
    onChange(next);
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={[styles.dropdownHeader, error && styles.dropdownHeaderError]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.modalLabel, error && { color: '#B91C1C' }]}>
            {label}
            {required ? '*' : ''}
          </Text>
          <Text style={styles.dropdownPreview} numberOfLines={1}>
            {preview}
          </Text>
        </View>
        {count > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{count}</Text>
          </View>
        )}
        <Text style={styles.chevron}>{open ? '▲' : '▼'}</Text>
      </Pressable>

      {open && (
        <>
          <Text style={styles.chipHint}>{hint}</Text>
          <View style={styles.chipWrap}>
            {options.map((opt) => {
              const isOn = selected.some((s) => s.toLowerCase() === opt.toLowerCase());
              return (
                <Pressable
                  key={opt}
                  onPress={() => toggle(opt)}
                  style={[styles.chip, isOn && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, isOn && styles.chipTextSelected]}>
                    {isOn ? '✓ ' : ''}
                    {opt}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </>
      )}
    </>
  );
}

// Styles mirror AddResidentModal so both pickers look identical.
const styles = StyleSheet.create({
  modalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginTop: 0,
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F3F3',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 10,
    gap: 10,
  },
  dropdownHeaderError: {
    borderWidth: 1,
    borderColor: '#B91C1C',
  },
  dropdownPreview: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  countBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 7,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  chevron: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '700',
  },
  chipHint: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
    marginTop: 4,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: '#F3F3F3',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  chipSelected: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  chipText: {
    fontSize: 14,
    color: '#111827',
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
