import { Toast } from '@/components/Toast';
import { dismissToast, useToasts } from './toasts';

/** Renders the current toast above the Nav Bar (phone) or bottom-left of the content (desktop). */
export function ToastHost() {
  const [t] = useToasts();
  if (!t) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(100px+env(safe-area-inset-bottom))] z-50 flex justify-center px-4 desktop:bottom-6 desktop:left-[264px]">
      <Toast
        key={t.id}
        className="pointer-events-auto"
        icon={t.icon}
        message={t.message}
        actionLabel={t.actionLabel}
        onAction={
          t.onAction
            ? () => {
                t.onAction?.();
                dismissToast(t.id);
              }
            : undefined
        }
      />
    </div>
  );
}
