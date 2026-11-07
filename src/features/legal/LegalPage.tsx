import { useNavigate, useParams } from 'react-router-dom';
import { TopBar } from '@/components/TopBar';

/**
 * /legal/terms and /legal/privacy, linked from sign-up (PRD section 8).
 * The policy wording must come from the product owner; until then this page
 * says so plainly rather than showing invented legal text.
 */
export function LegalPage() {
  const { doc } = useParams();
  const navigate = useNavigate();
  const title = doc === 'privacy' ? 'Privacy Policy' : 'Terms of Use';
  return (
    <div className="min-h-dvh canvas-gradient">
      <div className="mx-auto max-w-[640px]">
        <TopBar title={title} left={{ icon: 'back', label: 'Back', onClick: () => navigate(-1) }} />
        <article className="mx-5 mt-4 flex flex-col gap-3 rounded-20 bg-surface p-5 type-body text-body">
          <p>The full {title.toLowerCase()} will be published here before launch.</p>
          {doc === 'privacy' ? (
            <p>
              In short: Shoppa collects only your name, email and the content of your lists. There are no ads and no third-party
              trackers, and you can export or delete your data at any time. Shoppa follows the Nigeria Data Protection Act 2023.
            </p>
          ) : null}
        </article>
      </div>
    </div>
  );
}
