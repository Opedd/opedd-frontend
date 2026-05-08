import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';

// Phase 7.5 — Step2Ghost test suite (~30 tests).
//
// Mirrors Step2Beehiiv test pattern (Phase 6.5 ship at commit 1967985)
// with Ghost-specific test additions per design doc § 6 + commit-3
// FailureBanner + commit-5 SuccessView + commit-6 container.
//
// Mock pattern: same as Beehiiv tests. Behavioral verification of
// backend round-trip lives in opedd-backend Phase 7.0 commit f3784eb
// integration test (tests/integration-platform-webhook-ghost-hmac);
// frontend tests mock the API client and assert state-machine + view-
// render behavior.
//
// Connector behavioral fixtures discipline (per CLAUDE.md amendment
// b742366): mock shapes for runPlatformNativeApi responses are
// SOURCE-DERIVED from backend platform_native_api.ts shape (lines
// 51-54 GhostCredentials + 82-86 DirectFlipResult + 179-183 Ghost
// evidence + ghost.ts:18-23 GhostVerifyReason enum). Real-Ghost-
// end-to-end fixtures deferred to KI #165 § 5.5 cloudflared tunnel
// walk-runbook (founder action; not testable pre-walk).
//
// Mocked surfaces:
//   - @sentry/react — addBreadcrumb + captureException + captureMessage
//   - useAuth → getAccessToken returns a test JWT
//   - useWizardState → controlled per-test via mockHookReturn
//   - verifyOwnershipApi.{get, runPlatformNativeApi} — controlled per-
//     test via mockGet / mockRunPlatformNativeApi

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

const mockGet = vi.fn();
const mockRunPlatformNativeApi = vi.fn();
vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    verifyOwnershipApi: {
      get: (...args: unknown[]) => mockGet(...args),
      runPlatformNativeApi: (...args: unknown[]) => mockRunPlatformNativeApi(...args),
      issueVisibleTextToken: vi.fn(),
      verifyVisibleTextToken: vi.fn(),
      issueDnsTxtToken: vi.fn(),
      checkDnsTxtToken: vi.fn(),
    },
  };
});

import { Step2Ghost } from '../Step2Ghost';

// Default wizard-state shape: in_setup, step 2, no setup_data, no
// pending mutations. Per-test overrides via spread.
function makeWizardMock(
  overrides: Partial<UseWizardStateResult> = {},
): UseWizardStateResult {
  return {
    state: {
      setup_state: 'in_setup',
      setup_step: 2,
      setup_data: {},
      setup_complete: false,
      verification_status: 'pending',
    },
    setupState: 'in_setup',
    setupStep: 2,
    currentStep: 2,
    setupData: {},
    isLoading: false,
    isMutating: false,
    error: null,
    advance: vi.fn().mockResolvedValue({
      setup_state: 'in_setup',
      setup_step: 3,
      setup_data: {},
      setup_complete: false,
      verification_status: 'pending',
    }),
    saveStepData: vi.fn().mockResolvedValue({
      setup_state: 'in_setup',
      setup_step: 2,
      setup_data: {},
      setup_complete: false,
      verification_status: 'pending',
    }),
    refetch: vi.fn(),
    ...overrides,
  } as UseWizardStateResult;
}

beforeEach(() => {
  mockGet.mockReset();
  mockRunPlatformNativeApi.mockReset();
  mockHookReturn.mockReset();

  // Default mount-probe: not verified; URL_ENTRY proceeds normally.
  mockGet.mockResolvedValue({
    ownership_verification: null,
    is_verified: false,
  });

  mockHookReturn.mockReturnValue(makeWizardMock());
});

afterEach(() => {
  vi.useRealTimers();
});

// ─── URL_ENTRY rendering ──────────────────────────────────────────

describe('Step2Ghost — URL_ENTRY rendering', () => {
  it('01. renders header + both fields + Get Started link by default; button disabled until both fields filled', async () => {
    render(<Step2Ghost />);
    expect(
      await screen.findByRole('heading', { name: /connect your ghost site/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/ghost site url/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/admin api key/i)).toBeInTheDocument();

    const button = screen.getByRole('button', { name: /^connect ghost$/i });
    expect(button).toBeDisabled();

    const link = screen.getByRole('link', { name: /get started/i });
    expect(link).toHaveAttribute('href', 'https://ghost.org/');
    expect(link).toHaveAttribute('target', '_blank');

    fireEvent.change(screen.getByLabelText(/ghost site url/i), {
      target: { value: 'https://example.ghost.io' },
    });
    expect(button).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/admin api key/i), {
      target: { value: 'key_id:hex_secret' },
    });
    expect(button).not.toBeDisabled();
  });

  it('02. admin_api_key field is password-masked', async () => {
    render(<Step2Ghost />);
    const input = await screen.findByLabelText(/admin api key/i);
    expect((input as HTMLInputElement).type).toBe('password');
  });

  it('03. site_url field is text input (not password)', async () => {
    render(<Step2Ghost />);
    const input = await screen.findByLabelText(/ghost site url/i);
    expect((input as HTMLInputElement).type).toBe('text');
  });
});

// ─── URL_ENTRY → ACTIVE state machine ─────────────────────────────

describe('Step2Ghost — ACTIVE state machine', () => {
  function fillFields() {
    fireEvent.change(screen.getByLabelText(/ghost site url/i), {
      target: { value: 'https://example.ghost.io' },
    });
    fireEvent.change(screen.getByLabelText(/admin api key/i), {
      target: { value: 'key_id:hex_secret' },
    });
  }

  it('04. submit triggers ACTIVE: fields locked + initial loading copy rendered', async () => {
    mockRunPlatformNativeApi.mockReturnValue(new Promise(() => {}));

    render(<Step2Ghost />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    fillFields();
    fireEvent.click(screen.getByRole('button', { name: /^connect ghost$/i }));

    await waitFor(() =>
      expect(screen.getByText(/verifying with ghost/i)).toBeInTheDocument(),
    );

    const activeKeyInput = screen.getByLabelText(/admin api key/i) as HTMLInputElement;
    expect(activeKeyInput.disabled).toBe(true);
  });

  it('05. loading copy progression at <500ms, 500ms-2s, 2s+', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockRunPlatformNativeApi.mockReturnValue(new Promise(() => {}));

    render(<Step2Ghost />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    fillFields();
    fireEvent.click(screen.getByRole('button', { name: /^connect ghost$/i }));

    await waitFor(() =>
      expect(screen.getByText(/^verifying with ghost\.\.\.$/i)).toBeInTheDocument(),
    );

    await act(async () => {
      vi.advanceTimersByTime(600);
    });
    expect(screen.getByText(/this can take a moment/i)).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(1600);
    });
    expect(screen.getByText(/ghost is being slow/i)).toBeInTheDocument();
  });

  it('06. cancel button NOT visible at t=2s, IS visible at t=3s', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockRunPlatformNativeApi.mockReturnValue(new Promise(() => {}));

    render(<Step2Ghost />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    fillFields();
    fireEvent.click(screen.getByRole('button', { name: /^connect ghost$/i }));

    await waitFor(() =>
      expect(screen.getByText(/verifying with ghost/i)).toBeInTheDocument(),
    );

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    expect(
      screen.queryByRole('button', { name: /cancel verification/i }),
    ).not.toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(1100);
    });
    expect(
      screen.getByRole('button', { name: /cancel verification/i }),
    ).toBeInTheDocument();
  });

  it('07. cancel click during ACTIVE: returns to URL_ENTRY with values preserved', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockRunPlatformNativeApi.mockReturnValue(new Promise(() => {}));

    render(<Step2Ghost />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    fillFields();
    fireEvent.click(screen.getByRole('button', { name: /^connect ghost$/i }));

    await waitFor(() =>
      expect(screen.getByText(/verifying with ghost/i)).toBeInTheDocument(),
    );

    await act(async () => {
      vi.advanceTimersByTime(3100);
    });

    fireEvent.click(screen.getByRole('button', { name: /cancel verification/i }));

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /^connect ghost$/i }),
      ).toBeInTheDocument(),
    );
    expect(
      (screen.getByLabelText(/ghost site url/i) as HTMLInputElement).value,
    ).toBe('https://example.ghost.io');
    expect(
      (screen.getByLabelText(/admin api key/i) as HTMLInputElement).value,
    ).toBe('key_id:hex_secret');
  });
});

// ─── SUCCESS state ────────────────────────────────────────────────

describe('Step2Ghost — SUCCESS state', () => {
  function fillAndSubmit() {
    fireEvent.change(screen.getByLabelText(/ghost site url/i), {
      target: { value: 'https://example.ghost.io' },
    });
    fireEvent.change(screen.getByLabelText(/admin api key/i), {
      target: { value: 'key_id:hex_secret' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^connect ghost$/i }));
  }

  // Canonical Ghost success-evidence shape (source-verified at backend
  // platform_native_api.ts:179-183): platform: 'ghost'; site_url;
  // publication_name. NO pub_id, NO web_url (Beehiiv-only fields).
  function ghostSuccessResult(overrides: Record<string, unknown> = {}) {
    return {
      verified: true,
      method: 'platform_native_api',
      evidence: {
        platform: 'ghost',
        site_url: 'https://example.ghost.io',
        publication_name: "Founder's Site",
      },
      archive_job_id: 'job-1',
      webhook_registered: true,
      archive_estimated_count: 5,
      ...overrides,
    };
  }

  it('08. verified=true: SUCCESS renders headline with publication_name', async () => {
    mockRunPlatformNativeApi.mockResolvedValue(ghostSuccessResult());

    render(<Step2Ghost />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    fillAndSubmit();

    expect(
      await screen.findByRole('heading', { name: /connected to founder's site/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^continue now$/i }),
    ).toBeInTheDocument();
  });

  it('09. publication_name=null falls back to generic Ghost headline', async () => {
    mockRunPlatformNativeApi.mockResolvedValue(
      ghostSuccessResult({
        evidence: {
          platform: 'ghost',
          site_url: 'https://example.ghost.io',
          publication_name: null,
        },
      }),
    );

    render(<Step2Ghost />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    fillAndSubmit();

    expect(
      await screen.findByRole('heading', { name: /connected to your ghost site/i }),
    ).toBeInTheDocument();
  });

  it('10. countdown: wizard.advance() fires once after 3s', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const wizard = makeWizardMock();
    mockHookReturn.mockReturnValue(wizard);
    mockRunPlatformNativeApi.mockResolvedValue(ghostSuccessResult());

    render(<Step2Ghost />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    fillAndSubmit();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^continue now$/i })).toBeInTheDocument(),
    );

    await act(async () => {
      vi.advanceTimersByTime(2900);
    });
    expect(wizard.advance).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(200);
    });
    expect(wizard.advance).toHaveBeenCalledTimes(1);
    expect(wizard.advance).toHaveBeenCalledWith({});
  });

  it('11. Continue-now click bypasses countdown: wizard.advance fires immediately', async () => {
    const wizard = makeWizardMock();
    mockHookReturn.mockReturnValue(wizard);
    mockRunPlatformNativeApi.mockResolvedValue(ghostSuccessResult());

    render(<Step2Ghost />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    fillAndSubmit();

    const continueBtn = await screen.findByRole('button', {
      name: /^continue now$/i,
    });
    fireEvent.click(continueBtn);

    await waitFor(() => expect(wizard.advance).toHaveBeenCalledTimes(1));
  });

  it('12. click on SUCCESS card area advances; click on Why? button does NOT', async () => {
    const wizard = makeWizardMock();
    mockHookReturn.mockReturnValue(wizard);
    // archive_job_id=null renders deferred + Why? button (an
    // interactive descendant we use for the negative-click test).
    mockRunPlatformNativeApi.mockResolvedValue(
      ghostSuccessResult({ archive_job_id: null, archive_estimated_count: null }),
    );

    render(<Step2Ghost />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    fillAndSubmit();

    const card = await screen.findByRole('button', {
      name: /continue to the next step/i,
    });

    const whyButton = within(card).getByRole('button', { name: /why\?/i });
    fireEvent.click(whyButton);
    expect(wizard.advance).not.toHaveBeenCalled();

    const headline = within(card).getByRole('heading', { name: /connected to/i });
    fireEvent.click(headline);
    await waitFor(() => expect(wizard.advance).toHaveBeenCalledTimes(1));
  });

  it('13. archive_estimated_count > 1: shows "Importing N posts" (plural)', async () => {
    mockRunPlatformNativeApi.mockResolvedValue(
      ghostSuccessResult({ archive_estimated_count: 42 }),
    );

    render(<Step2Ghost />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    fillAndSubmit();

    expect(
      await screen.findByText(/importing 42 posts from your archive/i),
    ).toBeInTheDocument();
  });

  it('14. archive_estimated_count === 1: shows singular "Importing 1 post"', async () => {
    mockRunPlatformNativeApi.mockResolvedValue(
      ghostSuccessResult({ archive_estimated_count: 1 }),
    );

    render(<Step2Ghost />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    fillAndSubmit();

    expect(
      await screen.findByText(/importing 1 post from your archive/i),
    ).toBeInTheDocument();
  });

  it('15. archive_estimated_count === 0: shows "we\'ll import as you publish"', async () => {
    mockRunPlatformNativeApi.mockResolvedValue(
      ghostSuccessResult({ archive_estimated_count: 0 }),
    );

    render(<Step2Ghost />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    fillAndSubmit();

    expect(
      await screen.findByText(/we'll import posts as you publish/i),
    ).toBeInTheDocument();
  });

  it('16. archive_estimated_count === null: generic "Importing your archive" fallback', async () => {
    mockRunPlatformNativeApi.mockResolvedValue(
      ghostSuccessResult({ archive_estimated_count: null }),
    );

    render(<Step2Ghost />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    fillAndSubmit();

    expect(
      await screen.findByText(/^importing your archive$/i),
    ).toBeInTheDocument();
  });

  it('17. archive_job_id=null: shows "Archive sync deferred" line', async () => {
    mockRunPlatformNativeApi.mockResolvedValue(
      ghostSuccessResult({ archive_job_id: null, archive_estimated_count: null }),
    );

    render(<Step2Ghost />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    fillAndSubmit();

    expect(await screen.findByText(/archive sync deferred/i)).toBeInTheDocument();
    expect(screen.queryByText(/^importing your archive$/i)).not.toBeInTheDocument();
  });

  it('18. webhook_registered=false: shows "Real-time sync deferred" line', async () => {
    mockRunPlatformNativeApi.mockResolvedValue(
      ghostSuccessResult({ webhook_registered: false }),
    );

    render(<Step2Ghost />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    fillAndSubmit();

    expect(await screen.findByText(/real-time sync deferred/i)).toBeInTheDocument();
    expect(
      screen.queryByText(/^real-time sync enabled$/i),
    ).not.toBeInTheDocument();
  });
});

// ─── FAILURE banner mapping (GhostVerifyReason — 5 values) ────────

describe('Step2Ghost — FAILURE banner mapping', () => {
  function fillAndSubmit() {
    fireEvent.change(screen.getByLabelText(/ghost site url/i), {
      target: { value: 'https://example.ghost.io' },
    });
    fireEvent.change(screen.getByLabelText(/admin api key/i), {
      target: { value: 'key_id:hex_secret' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^connect ghost$/i }));
  }

  it('19. INVALID_API_KEY: copy + admin_api_key field highlight', async () => {
    mockRunPlatformNativeApi.mockResolvedValue({
      verified: false,
      method: 'platform_native_api',
      reason: 'INVALID_API_KEY',
    });

    render(<Step2Ghost />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    fillAndSubmit();

    expect(
      await screen.findByText(/your ghost admin api key wasn't accepted/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/admin api key/i)).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(screen.getByLabelText(/ghost site url/i)).not.toHaveAttribute(
      'aria-invalid',
    );
  });

  it('20. BAD_KEY_FORMAT: copy + admin_api_key field highlight', async () => {
    mockRunPlatformNativeApi.mockResolvedValue({
      verified: false,
      method: 'platform_native_api',
      reason: 'BAD_KEY_FORMAT',
    });

    render(<Step2Ghost />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    fillAndSubmit();

    expect(
      await screen.findByText(/isn't in the expected format/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/admin api key/i)).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  it('21. UNREACHABLE: copy + site_url field highlight', async () => {
    mockRunPlatformNativeApi.mockResolvedValue({
      verified: false,
      method: 'platform_native_api',
      reason: 'UNREACHABLE',
    });

    render(<Step2Ghost />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    fillAndSubmit();

    expect(
      await screen.findByText(/we couldn't reach your ghost site/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/ghost site url/i)).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  it('22. GHOST_SERVER_ERROR: copy, no field highlight', async () => {
    mockRunPlatformNativeApi.mockResolvedValue({
      verified: false,
      method: 'platform_native_api',
      reason: 'GHOST_SERVER_ERROR',
    });

    render(<Step2Ghost />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    fillAndSubmit();

    expect(
      await screen.findByText(/ghost returned an error/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/ghost site url/i)).not.toHaveAttribute(
      'aria-invalid',
    );
    expect(screen.getByLabelText(/admin api key/i)).not.toHaveAttribute(
      'aria-invalid',
    );
  });

  it('23. TIMEOUT: copy, no field highlight', async () => {
    mockRunPlatformNativeApi.mockResolvedValue({
      verified: false,
      method: 'platform_native_api',
      reason: 'TIMEOUT',
    });

    render(<Step2Ghost />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    fillAndSubmit();

    expect(
      await screen.findByText(/ghost took too long to respond/i),
    ).toBeInTheDocument();
  });

  it('24. 500 hard failure: generic banner, no field highlight', async () => {
    mockRunPlatformNativeApi.mockRejectedValue(new Error('Internal server error'));

    render(<Step2Ghost />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    fillAndSubmit();

    expect(
      await screen.findByText(/something went wrong on our side/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/ghost site url/i)).not.toHaveAttribute(
      'aria-invalid',
    );
  });

  it('25. 400 INVALID_PAYLOAD: "Both required" banner, both fields highlighted', async () => {
    mockRunPlatformNativeApi.mockRejectedValue(
      new Error('INVALID_PAYLOAD: site_url and admin_api_key required'),
    );

    render(<Step2Ghost />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    fillAndSubmit();

    expect(
      await screen.findByText(/both the site url and admin api key are required/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/ghost site url/i)).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(screen.getByLabelText(/admin api key/i)).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  it('26. re-submit clears banner; failure persists if rejected again', async () => {
    mockRunPlatformNativeApi.mockResolvedValueOnce({
      verified: false,
      method: 'platform_native_api',
      reason: 'INVALID_API_KEY',
    });

    render(<Step2Ghost />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    fillAndSubmit();

    expect(
      await screen.findByText(/your ghost admin api key wasn't accepted/i),
    ).toBeInTheDocument();

    mockRunPlatformNativeApi.mockReturnValueOnce(new Promise(() => {}));
    fireEvent.click(screen.getByRole('button', { name: /^connect ghost$/i }));

    await waitFor(() => {
      expect(
        screen.queryByText(/your ghost admin api key wasn't accepted/i),
      ).not.toBeInTheDocument();
    });
  });
});

// ─── DNS fallback link (Phase 7.5 addition vs Beehiiv) ────────────

describe('Step2Ghost — DNS fallback link', () => {
  function fillAndSubmit() {
    fireEvent.change(screen.getByLabelText(/ghost site url/i), {
      target: { value: 'https://example.com' },
    });
    fireEvent.change(screen.getByLabelText(/admin api key/i), {
      target: { value: 'key_id:hex_secret' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^connect ghost$/i }));
  }

  it('27. UNREACHABLE + fallback_available=dns_txt_record renders DNS fallback link', async () => {
    mockRunPlatformNativeApi.mockResolvedValue({
      verified: false,
      method: 'platform_native_api',
      reason: 'UNREACHABLE',
      fallback_available: 'dns_txt_record',
    });

    render(<Step2Ghost />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    fillAndSubmit();

    expect(
      await screen.findByRole('button', { name: /verify by dns txt record instead/i }),
    ).toBeInTheDocument();
  });

  it('28. UNREACHABLE WITHOUT fallback_available does NOT render DNS link (Ghost(Pro) *.ghost.io case)', async () => {
    mockRunPlatformNativeApi.mockResolvedValue({
      verified: false,
      method: 'platform_native_api',
      reason: 'UNREACHABLE',
      // fallback_available omitted — backend didn't detect custom domain
    });

    render(<Step2Ghost />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    fillAndSubmit();

    // Banner copy still renders
    expect(
      await screen.findByText(/we couldn't reach your ghost site/i),
    ).toBeInTheDocument();
    // But DNS fallback link does NOT
    expect(
      screen.queryByRole('button', { name: /verify by dns txt record instead/i }),
    ).not.toBeInTheDocument();
  });

  it('29. INVALID_API_KEY does NOT render DNS link even with fallback_available signal (reason-axis gate)', async () => {
    mockRunPlatformNativeApi.mockResolvedValue({
      verified: false,
      method: 'platform_native_api',
      reason: 'INVALID_API_KEY',
      fallback_available: 'dns_txt_record',
    });

    render(<Step2Ghost />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    fillAndSubmit();

    // Banner copy renders
    expect(
      await screen.findByText(/your ghost admin api key wasn't accepted/i),
    ).toBeInTheDocument();
    // But DNS fallback link does NOT (INVALID_API_KEY is not in
    // OQ-7.5-C eligible set; only UNREACHABLE/GHOST_SERVER_ERROR/
    // TIMEOUT trigger fallback)
    expect(
      screen.queryByRole('button', { name: /verify by dns txt record instead/i }),
    ).not.toBeInTheDocument();
  });
});

// ─── Mount-resume probe ───────────────────────────────────────────

describe('Step2Ghost — mount-resume probe', () => {
  it('30. ownership.is_verified=true on mount → SUCCESS resume_stale + immediate auto-advance', async () => {
    const wizard = makeWizardMock();
    mockHookReturn.mockReturnValue(wizard);

    mockGet.mockResolvedValue({
      ownership_verification: null,
      is_verified: true,
    });

    render(<Step2Ghost />);

    expect(
      await screen.findByRole('heading', {
        name: /connected to your ghost site/i,
      }),
    ).toBeInTheDocument();

    expect(
      screen.queryByText(/continuing to next step in/i),
    ).not.toBeInTheDocument();

    await waitFor(() => expect(wizard.advance).toHaveBeenCalledTimes(1));
  });
});
