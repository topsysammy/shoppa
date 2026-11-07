import { useEffect, useState } from 'react';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Icon } from '@/components/icons/Icon';
import { Modal } from '@/components/Modal';
import { cn } from '@/lib/cn';
import { findUnit, formatQuantity, unitChipLabel, unitGroups, unitsFor } from '@/lib/units';
import { useMyProfile } from './data';

type UnitPickerProps = {
  open: boolean;
  value: string | null;
  onClose: () => void;
  onPick: (unit: string | null) => void;
};

/** Screen 30 Choose unit: Count, Weight & volume, Market measures, or a custom "Other unit". */
export function UnitPicker({ open, value, onClose, onPick }: UnitPickerProps) {
  const profile = useMyProfile();
  const units = unitsFor(profile?.unitPrefs, profile?.unitSystem);
  const [picked, setPicked] = useState<string | null>(value);
  const [other, setOther] = useState(value && !findUnit(value) ? value : '');
  const known = (v: string | null) => Boolean(v && units.some((u) => u.id === v));

  useEffect(() => {
    if (open) {
      setPicked(value);
      setOther(value && !known(value) ? value : '');
    }
  }, [open, value]); // eslint-disable-line react-hooks/exhaustive-deps

  const done = () => {
    onPick(other.trim() ? other.trim().toLowerCase() : picked);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Choose unit" footer={<Button onClick={done}>Done</Button>}>
      <div className="flex flex-col gap-3.5 pt-1">
        {unitGroups.map((g) => (
          <fieldset key={g.id} className="flex flex-col gap-3.5">
            <legend className="mb-3.5 type-label text-body">{g.label}</legend>
            <div className="flex flex-wrap gap-2">
              {units
                .filter((u) => u.group === g.id)
                .map((u) => {
                  const active = picked === u.id && !other.trim();
                  return active ? (
                    <button
                      key={u.id}
                      type="button"
                      aria-pressed
                      onClick={() => setPicked(null)}
                      className="focus-ring inline-flex h-10 items-center gap-1.5 rounded-full bg-brand-strong px-[18px] type-body-strong text-on-brand"
                    >
                      <Icon name="check" size={14} strokeWidth={3} />
                      {unitChipLabel(u.id)}
                    </button>
                  ) : (
                    <Chip
                      key={u.id}
                      label={unitChipLabel(u.id)}
                      state="outline"
                      aria-pressed={false}
                      onClick={() => {
                        setPicked(u.id);
                        setOther('');
                      }}
                    />
                  );
                })}
            </div>
          </fieldset>
        ))}
        <label className="flex flex-col gap-2">
          <span className="sr-only">Other unit</span>
          <input
            value={other}
            maxLength={24}
            onChange={(e) => setOther(e.target.value)}
            placeholder="Other unit…"
            className={cn(
              'h-[52px] rounded-[14px] border bg-surface px-4 type-body text-ink placeholder:text-tertiary focus:border-[1.5px] focus:border-line-focus focus:outline-none',
              other.trim() ? 'border-line-focus' : 'border-line-strong',
            )}
          />
        </label>
      </div>
    </Modal>
  );
}

/** Field that looks like an Input with a chevron (screen 28 "Unit"). */
export function UnitField({ value, quantity, onOpen }: { value: string | null; quantity: number | null; onOpen: () => void }) {
  const label = value ? formatQuantity(quantity ?? 2, value).replace(/^[\d.]+\s/, '') : 'None';
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <span className="type-label text-body" id="unit-label">
        Unit
      </span>
      <button
        type="button"
        onClick={onOpen}
        aria-labelledby="unit-label"
        aria-haspopup="dialog"
        className="focus-ring flex h-[52px] items-center justify-between rounded-12 border border-line-strong bg-surface pl-4 pr-3.5 text-left type-body text-ink hover:bg-muted"
      >
        <span className={value ? '' : 'text-tertiary'}>{label}</span>
        <Icon name="chevron-down" size={18} />
      </button>
    </div>
  );
}
