import type { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { HelperExpandable } from './HelperExpandable';
import { FailureBanner, type UIFailure } from './FailureBanner';

interface URLEntryViewProps {
  name: string;
  onNameChange: (value: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  failure: UIFailure | null;
}

export function URLEntryView({
  name,
  onNameChange,
  onSubmit,
  isSubmitting,
  failure,
}: URLEntryViewProps) {
  const canSubmit = !isSubmitting;

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit();
  };

  return (
    <div className="min-h-screen bg-alice-gray px-6 py-12">
      <div className="max-w-xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold text-navy-deep mb-3">
            Create your API key
          </h1>
          <p className="text-gray-600 leading-relaxed">
            We'll issue an Opedd Publisher API key that lets your system push
            articles directly into your catalog.
          </p>
        </header>

        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          <div>
            <label
              htmlFor="api-name"
              className="block text-sm font-medium text-navy-deep mb-1.5"
            >
              Key name <span className="text-xs text-gray-400">(optional)</span>
            </label>
            <Input
              id="api-name"
              type="text"
              autoComplete="off"
              spellCheck={false}
              placeholder="Onboarding key"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              disabled={isSubmitting}
              maxLength={64}
            />
            <HelperExpandable id="api-name-helper" label="What's this for?">
              <p>
                A human-readable label so you can identify this key later
                in your dashboard. We'll default to "Onboarding key" if you
                leave this blank. You can revoke + reissue keys anytime
                from Settings.
              </p>
            </HelperExpandable>
          </div>

          {failure && <FailureBanner failure={failure} />}

          <div>
            <Button type="submit" disabled={!canSubmit} className="w-full">
              Create API key
            </Button>
          </div>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Want the full API reference?{' '}
          <a
            href="https://docs.opedd.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-navy-deep underline hover:no-underline"
          >
            docs.opedd.com
          </a>
        </p>
      </div>
    </div>
  );
}
