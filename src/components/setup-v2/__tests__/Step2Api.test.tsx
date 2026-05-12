import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

// Phase 8.6 — Step2Api test suite (~30 tests).
//
// Mirrors Step2Ghost test pattern (Phase 7.5 ship) with Step2Api-
// specific test additions for the canonical Phase 8 Publisher API
// onboarding path (no verify-ownership cascade; key-creation flow).
//
// Mocked surfaces:
//   - @sentry/react — addBreadcrumb + captureException
//   - useAuth → getAccessToken returns a test JWT
//   - useWizardState → controlled per-test via mockHookReturn
//   - publisherApi.{createApiKey, listApiKeys} — controlled per-test
//     via mockCreateApiKey / mockListApiKeys

vi.mock('@sentry/react', () => ({
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

import type { UseWizardStateResult } from '@/hooks/useWizardState';

const mockGetAccessToken = vi.fn(async () => 'test-jwt');
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ getAccessToken: mockGetAccessToken, user: { id: 'u1' } }),
}));

const mockHookReturn = vi.fn<() => UseWizardStateResult>();
vi.mock('@/hooks/useWizardState', () => ({
  useWizardState: () => mockHookReturn(),
}));

const mockCreateApiKey = vi.fn();
const mockListApiKeys = vi.fn();
vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    publisherApi: {
      createApiKey: (...args: unknown[]) => mockCreateApiKey(...args),
      listApiKeys: (...args: unknown[]) => mockListApiKeys(...args),
      registerWebhookWithApiKey: vi.fn(),
    },
  };
});

import { Step2Api } from '@/components/setup-v2/Step2Api';

function defaultState(
  overrides: Partial<UseWizardStateResult> = {},
): UseWizardStateResult {
  return {
    state: null,
    setupState: 'in_setup',
    currentStep: 2,
    setupData: {},
    dormant: false,
    canAdvance: false,
    canRegress: false,
    nextStep: null,
    prevStep: null,
    isLoading: false,
    isFetching: false,
    isMutating: false,
    isOffline: false,
    error: null,
    advance: vi.fn().mockResolvedValue({}),
    regress: vi.fn(),
    saveStepData: vi.fn().mockResolvedValue({}),
    refetch: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetAccessToken.mockResolvedValue('test-jwt');
  mockHookReturn.mockReturnValue(defaultState());
  // Default: list returns empty (no pre-existing key); create returns success.
  mockListApiKeys.mockResolvedValue({ keys: [] });
  mockCreateApiKey.mockResolvedValue({
    plaintext_key: 'opedd_pub_test_abc123def456abc123def456abc123de',
    key_prefix: 'opedd_pub_te',
    id: '00000000-0000-0000-0000-000000000001',
    environment: 'test',
    name: 'Onboarding key',
    scopes: [],
    created_at: '2026-05-12T08:00:00.000Z',
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

// ─── URL_ENTRY render ───────────────────────────────────────────────

describe('Step2Api — URL_ENTRY render', () => {
  it('renders the create-key form with environment selector + name input', () => {
    render(<Step2Api />);
    expect(screen.getByRole('heading', { name: /Create your API key/i })).toBeTruthy();
    expect(screen.getByLabelText(/Sandbox \(recommended for setup\)/i)).toBeTruthy();
    expect(screen.getByLabelText(/Live/i)).toBeTruthy();
    expect(screen.getByLabelText(/Key name/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Create API key/i })).toBeTruthy();
  });

  it('defaults to Sandbox environment', () => {
    render(<Step2Api />);
    const sandbox = screen.getByLabelText(/Sandbox/i) as HTMLInputElement;
    expect(sandbox.checked).toBe(true);
  });

  it('Create API key button is enabled by default (environment defaults to test)', () => {
    render(<Step2Api />);
    const btn = screen.getByRole('button', { name: /Create API key/i }) as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it('clicking Live radio switches environment selection', () => {
    render(<Step2Api />);
    const live = screen.getByLabelText(/^Live/i) as HTMLInputElement;
    fireEvent.click(live);
    expect(live.checked).toBe(true);
  });

  it('typing in the key name input updates state', () => {
    render(<Step2Api />);
    const input = screen.getByLabelText(/Key name/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'CMS production' } });
    expect(input.value).toBe('CMS production');
  });
});

// ─── Submit flow → ACTIVE → SUCCESS ────────────────────────────────

describe('Step2Api — submit → ACTIVE → SUCCESS happy path', () => {
  it('clicking Create API key transitions to ACTIVE view', async () => {
    // Block the promise so we can observe ACTIVE view
    let resolveCreate: (value: unknown) => void = () => {};
    mockCreateApiKey.mockReturnValue(new Promise((res) => { resolveCreate = res; }));
    render(<Step2Api />);
    fireEvent.click(screen.getByRole('button', { name: /Create API key/i }));
    await waitFor(() => {
      expect(screen.getByText(/Creating your API key/i)).toBeTruthy();
    });
    resolveCreate({
      plaintext_key: 'opedd_pub_test_abc123def456abc123def456abc123de',
      key_prefix: 'opedd_pub_te',
      id: '00000000-0000-0000-0000-000000000001',
      environment: 'test',
      name: 'Onboarding key',
      scopes: [],
      created_at: '2026-05-12T08:00:00.000Z',
    });
  });

  it('calls publisherApi.createApiKey with environment + name', async () => {
    render(<Step2Api />);
    fireEvent.change(screen.getByLabelText(/Key name/i), { target: { value: 'My CMS' } });
    fireEvent.click(screen.getByRole('button', { name: /Create API key/i }));
    await waitFor(() => expect(mockCreateApiKey).toHaveBeenCalledTimes(1));
    expect(mockCreateApiKey).toHaveBeenCalledWith(
      { environment: 'test', name: 'My CMS' },
      'test-jwt',
    );
  });

  it('default name "Onboarding key" used when name input is empty', async () => {
    render(<Step2Api />);
    fireEvent.click(screen.getByRole('button', { name: /Create API key/i }));
    await waitFor(() => expect(mockCreateApiKey).toHaveBeenCalledTimes(1));
    expect(mockCreateApiKey).toHaveBeenCalledWith(
      { environment: 'test', name: 'Onboarding key' },
      'test-jwt',
    );
  });

  it('on success, transitions to SUCCESS view with plaintext key reveal', async () => {
    render(<Step2Api />);
    fireEvent.click(screen.getByRole('button', { name: /Create API key/i }));
    await waitFor(() => {
      expect(screen.getByText(/Your API key is ready/i)).toBeTruthy();
    });
    expect(screen.getByText(/opedd_pub_test_abc123def456abc123def456abc123de/)).toBeTruthy();
    expect(screen.getByText(/Save this key now/i)).toBeTruthy();
  });

  it('on success, persists api_key_id + key_prefix + environment to setup_data (NEVER plaintext)', async () => {
    const saveStepData = vi.fn().mockResolvedValue({});
    mockHookReturn.mockReturnValue(defaultState({ saveStepData }));
    render(<Step2Api />);
    fireEvent.click(screen.getByRole('button', { name: /Create API key/i }));
    await waitFor(() => expect(saveStepData).toHaveBeenCalledTimes(1));
    const persisted = saveStepData.mock.calls[0][0];
    expect(persisted.api_key_id).toBe('00000000-0000-0000-0000-000000000001');
    expect(persisted.api_key_prefix).toBe('opedd_pub_te');
    expect(persisted.api_environment).toBe('test');
    // Critical: plaintext key MUST NOT be persisted
    expect(persisted.api_key).toBeUndefined();
    expect(persisted.key).toBeUndefined();
    expect(persisted.plaintext_key).toBeUndefined();
  });

  it('Live environment selection passes through to backend call', async () => {
    mockCreateApiKey.mockResolvedValue({
      plaintext_key: 'opedd_pub_xyz789xyz789xyz789xyz789xyz789xy',
      key_prefix: 'opedd_pub_xy',
      id: '00000000-0000-0000-0000-000000000002',
      environment: 'live',
      name: 'Live key',
      scopes: [],
      created_at: '2026-05-12T08:00:00.000Z',
    });
    render(<Step2Api />);
    fireEvent.click(screen.getByLabelText(/^Live/i));
    fireEvent.click(screen.getByRole('button', { name: /Create API key/i }));
    await waitFor(() => expect(mockCreateApiKey).toHaveBeenCalledTimes(1));
    expect(mockCreateApiKey).toHaveBeenCalledWith(
      { environment: 'live', name: 'Onboarding key' },
      'test-jwt',
    );
  });
});

// ─── Failure paths → URL_ENTRY with banner ─────────────────────────

describe('Step2Api — failure → URL_ENTRY banner', () => {
  it('VALIDATION_FAILED error → invalid-input banner + return to URL_ENTRY', async () => {
    mockCreateApiKey.mockRejectedValue(new Error('VALIDATION_FAILED: Invalid input'));
    render(<Step2Api />);
    fireEvent.click(screen.getByRole('button', { name: /Create API key/i }));
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeTruthy();
    });
    expect(screen.getByText(/form values weren't accepted/i)).toBeTruthy();
    // Returned to URL_ENTRY: button visible again
    expect(screen.getByRole('button', { name: /Create API key/i })).toBeTruthy();
  });

  it('UNAUTHORIZED error → session-expired banner', async () => {
    mockCreateApiKey.mockRejectedValue(new Error('No authorization token provided'));
    render(<Step2Api />);
    fireEvent.click(screen.getByRole('button', { name: /Create API key/i }));
    await waitFor(() => expect(screen.getByText(/session expired/i)).toBeTruthy());
  });

  it('RATE_LIMITED error → rate-limit banner', async () => {
    mockCreateApiKey.mockRejectedValue(new Error('Rate limit exceeded'));
    render(<Step2Api />);
    fireEvent.click(screen.getByRole('button', { name: /Create API key/i }));
    await waitFor(() => expect(screen.getByText(/too many API keys/i)).toBeTruthy());
  });

  it('generic network error → internal-error banner + Sentry captured', async () => {
    const Sentry = await import('@sentry/react');
    mockCreateApiKey.mockRejectedValue(new Error('Network failure'));
    render(<Step2Api />);
    fireEvent.click(screen.getByRole('button', { name: /Create API key/i }));
    await waitFor(() => expect(screen.getByText(/Something went wrong on our side/i)).toBeTruthy());
    expect(Sentry.captureException).toHaveBeenCalled();
  });

  it('input values preserved after failure (publisher can retry without re-typing)', async () => {
    mockCreateApiKey.mockRejectedValue(new Error('Network failure'));
    render(<Step2Api />);
    fireEvent.change(screen.getByLabelText(/Key name/i), { target: { value: 'Preserved name' } });
    fireEvent.click(screen.getByLabelText(/^Live/i));
    fireEvent.click(screen.getByRole('button', { name: /Create API key/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    // After failure, values should still be in the form
    expect((screen.getByLabelText(/Key name/i) as HTMLInputElement).value).toBe('Preserved name');
    expect((screen.getByLabelText(/^Live/i) as HTMLInputElement).checked).toBe(true);
  });
});

// ─── Cancel from ACTIVE ────────────────────────────────────────────

describe('Step2Api — cancel from ACTIVE', () => {
  it('cancel button appears after 3s elapsed', async () => {
    vi.useFakeTimers();
    let resolveCreate: (value: unknown) => void = () => {};
    mockCreateApiKey.mockReturnValue(new Promise((res) => { resolveCreate = res; }));
    render(<Step2Api />);
    fireEvent.click(screen.getByRole('button', { name: /Create API key/i }));

    // Advance to 3s — cancel button should appear
    await act(async () => {
      vi.advanceTimersByTime(3100);
    });

    expect(screen.getByRole('button', { name: /Cancel key creation/i })).toBeTruthy();
    resolveCreate({
      plaintext_key: 'opedd_pub_test_x',
      key_prefix: 'opedd_pub_te',
      id: 'id1',
      environment: 'test',
      name: 'k',
      scopes: [],
      created_at: '2026-05-12T08:00:00.000Z',
    });
    vi.useRealTimers();
  });

  it('cancel returns to URL_ENTRY with values preserved', async () => {
    vi.useFakeTimers();
    let resolveCreate: (value: unknown) => void = () => {};
    mockCreateApiKey.mockReturnValue(new Promise((res) => { resolveCreate = res; }));
    render(<Step2Api />);
    fireEvent.change(screen.getByLabelText(/Key name/i), { target: { value: 'My name' } });
    fireEvent.click(screen.getByRole('button', { name: /Create API key/i }));

    await act(async () => { vi.advanceTimersByTime(3100); });
    fireEvent.click(screen.getByRole('button', { name: /Cancel key creation/i }));

    // Back in URL_ENTRY
    expect(screen.getByRole('button', { name: /Create API key/i })).toBeTruthy();
    expect((screen.getByLabelText(/Key name/i) as HTMLInputElement).value).toBe('My name');

    // Resolve the still-pending promise — should NOT advance to SUCCESS
    // (stale-response short-circuit via requestIdRef).
    resolveCreate({
      plaintext_key: 'opedd_pub_test_x',
      key_prefix: 'opedd_pub_te',
      id: 'id1',
      environment: 'test',
      name: 'k',
      scopes: [],
      created_at: '2026-05-12T08:00:00.000Z',
    });
    await act(async () => { await Promise.resolve(); });

    expect(screen.queryByText(/Your API key is ready/i)).toBeNull();
    vi.useRealTimers();
  });
});

// ─── SUCCESS view behavior ─────────────────────────────────────────

describe('Step2Api — SUCCESS view', () => {
  it('shows plaintext key value after successful create', async () => {
    render(<Step2Api />);
    fireEvent.click(screen.getByRole('button', { name: /Create API key/i }));
    await waitFor(() =>
      expect(screen.getByText(/opedd_pub_test_abc123def456abc123def456abc123de/)).toBeTruthy(),
    );
  });

  it('plaintext key value renders verbatim in <code> element (Phase 8.6.0 regression guard)', async () => {
    // Phase 8.6.0 amendment: backend returns plaintext_key (snake_case)
    // not key. Pre-amendment shipped at 39f98b0 read result.key →
    // undefined → empty <code> element. This assertion guards against
    // recurrence of the field-name-mismatch class.
    render(<Step2Api />);
    fireEvent.click(screen.getByRole('button', { name: /Create API key/i }));
    await waitFor(() => expect(screen.getByText(/Your API key is ready/i)).toBeTruthy());
    const codeEl = document.getElementById('api-key-reveal');
    expect(codeEl).not.toBeNull();
    expect(codeEl?.textContent).toBe('opedd_pub_test_abc123def456abc123def456abc123de');
  });

  it('Continue button DISABLED until acknowledgment checkbox is checked (Phase 8.6.0 UX gate)', async () => {
    render(<Step2Api />);
    fireEvent.click(screen.getByRole('button', { name: /Create API key/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /^Continue$/i })).toBeTruthy());
    const continueBtn = screen.getByRole('button', { name: /^Continue$/i }) as HTMLButtonElement;
    expect(continueBtn.disabled).toBe(true);
  });

  it('after checking acknowledgment checkbox, Continue button enabled + advances on click', async () => {
    const advance = vi.fn().mockResolvedValue({});
    mockHookReturn.mockReturnValue(defaultState({ advance }));
    render(<Step2Api />);
    fireEvent.click(screen.getByRole('button', { name: /Create API key/i }));
    await waitFor(() =>
      expect(screen.getByLabelText(/I've saved this key in a secure location/i)).toBeTruthy(),
    );
    const checkbox = screen.getByLabelText(/I've saved this key in a secure location/i) as HTMLInputElement;
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);
    const continueBtn = screen.getByRole('button', { name: /^Continue$/i }) as HTMLButtonElement;
    expect(continueBtn.disabled).toBe(false);
    fireEvent.click(continueBtn);
    await waitFor(() => expect(advance).toHaveBeenCalledWith({}));
  });

  it('no auto-advance — view persists indefinitely until user-driven advance (Phase 8.6.0 UX change)', async () => {
    vi.useFakeTimers();
    const advance = vi.fn().mockResolvedValue({});
    mockHookReturn.mockReturnValue(defaultState({ advance }));
    render(<Step2Api />);
    fireEvent.click(screen.getByRole('button', { name: /Create API key/i }));
    await act(async () => { await Promise.resolve(); });
    // Advance well beyond the OLD 6s countdown — view should STILL be
    // showing; advance should NOT have fired (no auto-advance).
    await act(async () => { vi.advanceTimersByTime(30000); });
    expect(advance).not.toHaveBeenCalled();
    expect(screen.getByText(/Your API key is ready/i)).toBeTruthy();
    vi.useRealTimers();
  });

  it('persistent "save this key now" warning is shown', async () => {
    render(<Step2Api />);
    fireEvent.click(screen.getByRole('button', { name: /Create API key/i }));
    await waitFor(() => expect(screen.getByText(/Save this key now/i)).toBeTruthy());
    expect(screen.getByText(/can't show it again/i)).toBeTruthy();
  });
});

// ─── Mount-resume probe ────────────────────────────────────────────

describe('Step2Api — mount-resume probe', () => {
  it('no probe fired when setup_data.api_key_id is absent', async () => {
    render(<Step2Api />);
    // give effects a tick
    await act(async () => { await Promise.resolve(); });
    expect(mockListApiKeys).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: /Create your API key/i })).toBeTruthy();
  });

  it('probe fires when setup_data.api_key_id is present + skips to SUCCESS resume_stale on match', async () => {
    const advance = vi.fn().mockResolvedValue({});
    mockHookReturn.mockReturnValue(
      defaultState({
        advance,
        setupData: {
          api_key_id: '00000000-0000-0000-0000-000000000099',
          api_key_prefix: 'opedd_pub_te',
          api_environment: 'test',
        },
      }),
    );
    mockListApiKeys.mockResolvedValue({
      keys: [
        {
          id: '00000000-0000-0000-0000-000000000099',
          key_prefix: 'opedd_pub_te',
          environment: 'test',
          name: 'prior',
          scopes: [],
          created_at: '2026-05-12T08:00:00.000Z',
          last_used_at: null,
          revoked_at: null,
        },
      ],
    });
    render(<Step2Api />);
    await waitFor(() => expect(mockListApiKeys).toHaveBeenCalled());
    // resume_stale view auto-advances
    await waitFor(() => expect(advance).toHaveBeenCalledWith({}));
  });

  it('probe failure (network) → fallback to URL_ENTRY (non-blocking)', async () => {
    mockHookReturn.mockReturnValue(
      defaultState({
        setupData: { api_key_id: '00000000-0000-0000-0000-000000000099' },
      }),
    );
    mockListApiKeys.mockRejectedValue(new Error('Network'));
    render(<Step2Api />);
    await waitFor(() => expect(mockListApiKeys).toHaveBeenCalled());
    // No SUCCESS state — falls through to URL_ENTRY
    expect(screen.getByRole('heading', { name: /Create your API key/i })).toBeTruthy();
  });

  it('probe returns no matching key → fallback to URL_ENTRY (revoked OR mismatched id)', async () => {
    mockHookReturn.mockReturnValue(
      defaultState({
        setupData: { api_key_id: '00000000-0000-0000-0000-000000000099' },
      }),
    );
    mockListApiKeys.mockResolvedValue({
      keys: [
        {
          id: '00000000-0000-0000-0000-000000000099',
          key_prefix: 'opedd_pub_te',
          environment: 'test',
          name: 'prior',
          scopes: [],
          created_at: '2026-05-12T08:00:00.000Z',
          last_used_at: null,
          revoked_at: '2026-05-12T09:00:00.000Z',  // revoked!
        },
      ],
    });
    render(<Step2Api />);
    await waitFor(() => expect(mockListApiKeys).toHaveBeenCalled());
    expect(screen.getByRole('heading', { name: /Create your API key/i })).toBeTruthy();
  });
});

// ─── Idempotency & rapid double-submit guard ───────────────────────

describe('Step2Api — double-submit guard', () => {
  it('rapid double-click only fires one createApiKey call', async () => {
    let resolveCreate: (value: unknown) => void = () => {};
    mockCreateApiKey.mockReturnValue(new Promise((res) => { resolveCreate = res; }));
    render(<Step2Api />);
    const btn = screen.getByRole('button', { name: /Create API key/i });
    fireEvent.click(btn);
    fireEvent.click(btn);
    fireEvent.click(btn);
    // Wait for the fact that ACTIVE view rendered
    await waitFor(() => expect(screen.getByText(/Creating your API key/i)).toBeTruthy());
    expect(mockCreateApiKey).toHaveBeenCalledTimes(1);
    resolveCreate({
      plaintext_key: 'opedd_pub_test_x',
      key_prefix: 'opedd_pub_te',
      id: 'id1',
      environment: 'test',
      name: 'k',
      scopes: [],
      created_at: '2026-05-12T08:00:00.000Z',
    });
  });
});

// ─── Helper-expandable a11y ────────────────────────────────────────

describe('Step2Api — HelperExpandable a11y', () => {
  it('toggles aria-expanded on click', () => {
    render(<Step2Api />);
    const helper = screen.getByRole('button', { name: /Sandbox vs Live\?/i });
    expect(helper.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(helper);
    expect(helper.getAttribute('aria-expanded')).toBe('true');
  });
});

// ─── Failure → recovery → success ──────────────────────────────────

describe('Step2Api — failure → recovery → success', () => {
  it('after first-attempt failure, re-clicking Create succeeds on second attempt', async () => {
    mockCreateApiKey
      .mockRejectedValueOnce(new Error('Network'))
      .mockResolvedValueOnce({
        plaintext_key: 'opedd_pub_test_recoveredkey1234567890abcdef1234',
        key_prefix: 'opedd_pub_te',
        id: '00000000-0000-0000-0000-000000000003',
        environment: 'test',
        name: 'recovered',
        scopes: [],
        created_at: '2026-05-12T08:00:00.000Z',
      });
    render(<Step2Api />);
    fireEvent.click(screen.getByRole('button', { name: /Create API key/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /Create API key/i }));
    await waitFor(() => expect(screen.getByText(/Your API key is ready/i)).toBeTruthy());
    expect(mockCreateApiKey).toHaveBeenCalledTimes(2);
  });
});
