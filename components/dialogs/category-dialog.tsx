'use client';

import { Button as FluentButton } from '@fluentui/react-components';
import { Check } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { useAppState } from '@/components/app-state';
import { useDialogs } from '@/components/dialogs/dialog-provider';
import { categoryColors } from '@/lib/sample-data';
import type { Kind } from '@/lib/types';

export function CategoryDialog() {
  const { categories, saveCategory } = useAppState();
  const { editing, seedCategory, close } = useDialogs();
  const [name, setName] = useState(seedCategory?.name ?? '');
  const [color, setColor] = useState(seedCategory?.color ?? '#3565c9');
  const [type, setType] = useState<Kind>(seedCategory?.type ?? 'expense');
  const [error, setError] = useState('');

  const submit = (event: React.SyntheticEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    const duplicate = categories.some(
      (c) =>
        c.id !== editing &&
        c.type === type &&
        c.name.toLowerCase() === name.trim().toLowerCase(),
    );
    if (duplicate) {
      setError('A category with this name already exists.');
      return;
    }
    saveCategory({ id: editing, name: name.trim(), type, color });
    close();
  };

  return (
    <form onSubmit={submit}>
      <label>
        Name
        <Input
          required
          autoFocus
          value={name}
          maxLength={40}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label>
        Type
        <select
          disabled={Boolean(editing)}
          value={type}
          onChange={(e) => setType(e.target.value as Kind)}
        >
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>
      </label>
      <fieldset className="color-field">
        <legend>Category color</legend>
        <div className="color-swatches">
          {categoryColors.map((swatch) => (
            <button
              key={swatch}
              type="button"
              aria-label={`Choose color ${swatch}`}
              aria-pressed={color === swatch}
              className={color === swatch ? 'chosen' : ''}
              style={{ background: swatch }}
              onClick={() => setColor(swatch)}
            >
              {color === swatch && <Check size={16} />}
            </button>
          ))}
        </div>
        <label className="custom-color">
          Custom color
          <input
            type="color"
            aria-label="Custom category color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
          <code>{color.toUpperCase()}</code>
        </label>
        <span
          className="category-pill badge-preview"
          style={{ background: `${color}20`, borderColor: `${color}55` }}
        >
          <i style={{ background: color }} />
          {name.trim() || 'Category preview'}
        </span>
      </fieldset>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <FluentButton type="submit" appearance="primary">
        Save category
      </FluentButton>
    </form>
  );
}
