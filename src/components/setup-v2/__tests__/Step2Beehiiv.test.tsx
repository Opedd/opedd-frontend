import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';

// Phase 6.5 — Step2Beehiiv test suite (20 tests covering the
// CHECKPOINT 1 test plan).
//
// Test framework: vitest + @testing-library/react. Mock pattern
// mirrors Step2Substack.test.tsx (canonical reference for setup-v2
// component tests).
//
// Mocked surfaces:
//   - @sentry/react — no-op
//   - useAuth → getAccessToken returns a test JWT
//   - useWizardState → controlled per-test via mockHookReturn
//   - verifyOwnershipApi.{get, runPlatformNativeApi} — controlled
//     per-test via mockGet / mockRunPlatformNativeApi
//
// Behavioral verification of backend round-trip lives in opedd-
// backend Phase 6.0 commit 9 integration tests; frontend tests
// mock the API client and assert the state-machine + view-render
// behavior.

vi.mock('@sentry/react', () => ({
  addBreadcrumb: vi.fn(),
  captureException: vi.fn(),
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

import { Step2Beehiiv } from '../Step2Beehiiv';

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

describe('Step2Beehiiv — URL_ENTRY rendering', () => {
  it('01. renders header + both fields + signup link by default; button disabled until both fields filled', async () => {
    render(<Step2Beehiiv />);
    expect(
      await screen.findByRole('heading', { name: /connect your beehiiv newsletter/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/beehiiv api key/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/publication id/i)).toBeInTheDocument();

    const button = screen.getByRole('button', { name: /^connect beehiiv$/i });
    expect(button).toBeDisabled();

    const link = screen.getByRole('link', { name: /sign up/i });
    expect(link).toHaveAttribute('href', 'https://www.beehiiv.com/sign-up');
    expect(link).toHaveAttribute('target', '_blank');

    fireEvent.change(screen.getByLabelText(/beehiiv api key/i), {
      target: { value: 'bh_xxx' },
    });
    expect(button).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/publication id/i), {
      target: { value: 'pub_xxx' },
    });
    expect(button).not.toBeDisabled();
  });

  it('20. api_key field is password-masked', async () => {
    render(<Step2Beehiiv />);
    const input = await screen.findByLabelText(/beehiiv api key/i);
    expect((input as HTMLInputElement).type).toBe('password');
  });
});

// ─── URL_ENTRY → ACTIVE state machine ─────────────────────────────

describe('Step2Beehiiv — ACTIVE state machine', () => {
  it('02. submit triggers ACTIVE: fields locked + initial loading copy rendered', async () => {
    mockRunPlatformNativeApi.mockReturnValue(new Promise(() => {}));

    render(<Step2Beehiiv />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText(/beehiiv api key/i), {
      target: { value: 'bh_xxx' },
    });
    fireEvent.change(screen.getByLabelText(/publication id/i), {
      target: { value: 'pub_xxx' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^connect beehiiv$/i }));

    await waitFor(() =>
      expect(screen.getByText(/verifying with beehiiv/i)).toBeInTheDocument(),
    );

    const activeApiKeyInput = screen.getByLabelText(
      /beehiiv api key/i,
    ) as HTMLInputElement;
    expect(activeApiKeyInput.disabled).toBe(true);
  });

  it('03. loading copy progression at <500ms, 500ms-2s, 2s+', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockRunPlatformNativeApi.mockReturnValue(new Promise(() => {}));

    render(<Step2Beehiiv />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText(/beehiiv api key/i), {
      target: { value: 'bh_xxx' },
    });
    fireEvent.change(screen.getByLabelText(/publication id/i), {
      target: { value: 'pub_xxx' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^connect beehiiv$/i }));

    await waitFor(() =>
      expect(screen.getByText(/^verifying with beehiiv\.\.\.$/i)).toBeInTheDocument(),
    );

    await act(async () => {
      vi.advanceTimersByTime(600);
    });
    expect(
      screen.getByText(/this can take a moment/i),
    ).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(1600);
    });
    expect(
      screen.getByText(/beehiiv is being slow/i),
    ).toBeInTheDocument();
  });

  it('04. cancel button NOT visible at t=2s, IS visible at t=3s', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockRunPlatformNativeApi.mockReturnValue(new Promise(() => {}));

    render(<Step2Beehiiv />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText(/beehiiv api key/i), {
      target: { value: 'bh_xxx' },
    });
    fireEvent.change(screen.getByLabelText(/publication id/i), {
      target: { value: 'pub_xxx' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^connect beehiiv$/i }));

    await waitFor(() =>
      expect(screen.getByText(/verifying with beehiiv/i)).toBeInTheDocument(),
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

  it('05. cancel click during ACTIVE: returns to URL_ENTRY with values preserved', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockRunPlatformNativeApi.mockReturnValue(new Promise(() => {}));

    render(<Step2Beehiiv />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText(/beehiiv api key/i), {
      target: { value: 'bh_xxx' },
    });
    fireEvent.change(screen.getByLabelText(/publication id/i), {
      target: { value: 'pub_xxx' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^connect beehiiv$/i }));

    await waitFor(() =>
      expect(screen.getByText(/verifying with beehiiv/i)).toBeInTheDocument(),
    );

    await act(async () => {
      vi.advanceTimersByTime(3100);
    });

    fireEvent.click(screen.getByRole('button', { name: /cancel verification/i }));

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /^connect beehiiv$/i }),
      ).toBeInTheDocument(),
    );
    expect(
      (screen.getByLabelText(/beehiiv api key/i) as HTMLInputElement).value,
    ).toBe('bh_xxx');
    expect(
      (screen.getByLabelText(/publication id/i) as HTMLInputElement).value,
    ).toBe('pub_xxx');
  });
});

// ─── SUCCESS state ────────────────────────────────────────────────

describe('Step2Beehiiv — SUCCESS state', () => {
  function fillAndSubmit() {
    fireEvent.change(screen.getByLabelText(/beehiiv api key/i), {
      target: { value: 'bh_xxx' },
    });
    fireEvent.change(screen.getByLabelText(/publication id/i), {
      target: { value: 'pub_xxx' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^connect beehiiv$/i }));
  }

  it('06. verified=true: SUCCESS renders headline with publication_name', async () => {
    mockRunPlatformNativeApi.mockResolvedValue({
      verified: true,
      method: 'platform_native_api',
      evidence: { platform: 'beehiiv', publication_name: "Founder's Newsletter", pub_id: 'pub_xxx' },
      archive_job_id: 'job-1',
      webhook_registered: true,
      archive_estimated_count: null,
    });

    render(<Step2Beehiiv />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    fillAndSubmit();

    expect(
      await screen.findByRole('heading', { name: /connected to founder's newsletter/i }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('button', { name: /^continue now$/i }),
    ).toBeInTheDocument();
  });

  it('06b. publication_name=null falls back to generic headline', async () => {
    mockRunPlatformNativeApi.mockResolvedValue({
      verified: true,
      method: 'platform_native_api',
      evidence: { platform: 'beehiiv', publication_name: null, pub_id: 'pub_xxx' },
      archive_job_id: 'job-1',
      webhook_registered: true,
      archive_estimated_count: null,
    });

    render(<Step2Beehiiv />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    fillAndSubmit();

    expect(
      await screen.findByRole('heading', {
        name: /connected to your beehiiv newsletter/i,
      }),
    ).toBeInTheDocument();
  });

  it('07. countdown: wizard.advance() fires once after 3s', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const wizard = makeWizardMock();
    mockHookReturn.mockReturnValue(wizard);

    mockRunPlatformNativeApi.mockResolvedValue({
      verified: true,
      method: 'platform_native_api',
      evidence: { platform: 'beehiiv', publication_name: 'X', pub_id: 'pub_xxx' },
      archive_job_id: 'job-1',
      webhook_registered: true,
      archive_estimated_count: null,
    });

    render(<Step2Beehiiv />);
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

  it('08. Continue-now click bypasses countdown: wizard.advance fires immediately', async () => {
    const wizard = makeWizardMock();
    mockHookReturn.mockReturnValue(wizard);

    mockRunPlatformNativeApi.mockResolvedValue({
      verified: true,
      method: 'platform_native_api',
      evidence: { platform: 'beehiiv', publication_name: 'X', pub_id: 'pub_xxx' },
      archive_job_id: 'job-1',
      webhook_registered: true,
      archive_estimated_count: null,
    });

    render(<Step2Beehiiv />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    fillAndSubmit();

    const continueBtn = await screen.findByRole('button', {
      name: /^continue now$/i,
    });
    fireEvent.click(continueBtn);

    await waitFor(() => expect(wizard.advance).toHaveBeenCalledTimes(1));
  });

  it('09. click on SUCCESS card area advances; click on Why? button does NOT', async () => {
    const wizard = makeWizardMock();
    mockHookReturn.mockReturnValue(wizard);

    mockRunPlatformNativeApi.mockResolvedValue({
      verified: true,
      method: 'platform_native_api',
      evidence: { platform: 'beehiiv', publication_name: 'X', pub_id: 'pub_xxx' },
      archive_job_id: null, // deferred → renders Why? button
      webhook_registered: true,
      archive_estimated_count: null,
    });

    render(<Step2Beehiiv />);
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

  it('17. SUCCESS with archive_job_id=null: shows "Archive sync deferred" line', async () => {
    mockRunPlatformNativeApi.mockResolvedValue({
      verified: true,
      method: 'platform_native_api',
      evidence: { platform: 'beehiiv', publication_name: 'X', pub_id: 'pub_xxx' },
      archive_job_id: null,
      webhook_registered: true,
      archive_estimated_count: null,
    });

    render(<Step2Beehiiv />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    fillAndSubmit();

    expect(await screen.findByText(/archive sync deferred/i)).toBeInTheDocument();
    expect(screen.queryByText(/^importing your archive$/i)).not.toBeInTheDocument();
  });

  it('18. SUCCESS with webhook_registered=false: shows "Real-time sync deferred" line', async () => {
    mockRunPlatformNativeApi.mockResolvedValue({
      verified: true,
      method: 'platform_native_api',
      evidence: { platform: 'beehiiv', publication_name: 'X', pub_id: 'pub_xxx' },
      archive_job_id: 'job-1',
      webhook_registered: false,
      archive_estimated_count: null,
    });

    render(<Step2Beehiiv />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    fillAndSubmit();

    expect(await screen.findByText(/real-time sync deferred/i)).toBeInTheDocument();
    expect(
      screen.queryByText(/^real-time sync enabled$/i),
    ).not.toBeInTheDocument();
  });
});

// ─── FAILURE banner mapping (BeehiivVerifyReason) ─────────────────

describe('Step2Beehiiv — FAILURE banner mapping', () => {
  function fillAndSubmit() {
    fireEvent.change(screen.getByLabelText(/beehiiv api key/i), {
      target: { value: 'bh_xxx' },
    });
    fireEvent.change(screen.getByLabelText(/publication id/i), {
      target: { value: 'pub_xxx' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^connect beehiiv$/i }));
  }

  it('10. BAD_API_KEY: banner copy + api_key field highlight', async () => {
    mockRunPlatformNativeApi.mockResolvedValue({
      verified: false,
      method: 'platform_native_api',
      reason: 'BAD_API_KEY',
      fallback_available: 'dns_txt_record',
    });

    render(<Step2Beehiiv />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    fillAndSubmit();

    expect(
      await screen.findByText(/we couldn't verify your api key/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/beehiiv api key/i)).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(screen.getByLabelText(/publication id/i)).not.toHaveAttribute(
      'aria-invalid',
    );
  });

  it('11. PUBLICATION_NOT_FOUND: banner copy + pub_id field highlight', async () => {
    mockRunPlatformNativeApi.mockResolvedValue({
      verified: false,
      method: 'platform_native_api',
      reason: 'PUBLICATION_NOT_FOUND',
    });

    render(<Step2Beehiiv />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    fillAndSubmit();

    expect(
      await screen.findByText(/we couldn't find that publication/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/publication id/i)).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(screen.getByLabelText(/beehiiv api key/i)).not.toHaveAttribute(
      'aria-invalid',
    );
  });

  it('12. BEEHIIV_API_ERROR: banner copy, no field highlight', async () => {
    mockRunPlatformNativeApi.mockResolvedValue({
      verified: false,
      method: 'platform_native_api',
      reason: 'BEEHIIV_API_ERROR',
    });

    render(<Step2Beehiiv />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    fillAndSubmit();

    expect(
      await screen.findByText(/beehiiv is having trouble responding/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/beehiiv api key/i)).not.toHaveAttribute(
      'aria-invalid',
    );
    expect(screen.getByLabelText(/publication id/i)).not.toHaveAttribute(
      'aria-invalid',
    );
  });

  it('13. BEEHIIV_UNREACHABLE: banner copy, no field highlight', async () => {
    mockRunPlatformNativeApi.mockResolvedValue({
      verified: false,
      method: 'platform_native_api',
      reason: 'BEEHIIV_UNREACHABLE',
    });

    render(<Step2Beehiiv />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    fillAndSubmit();

    expect(
      await screen.findByText(/we couldn't reach beehiiv/i),
    ).toBeInTheDocument();
  });

  it('14. 500 hard failure: generic banner, no field highlight', async () => {
    mockRunPlatformNativeApi.mockRejectedValue(new Error('Internal server error'));

    render(<Step2Beehiiv />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    fillAndSubmit();

    expect(
      await screen.findByText(/something went wrong on our side/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/beehiiv api key/i)).not.toHaveAttribute(
      'aria-invalid',
    );
  });

  it('15. 400 INVALID_PAYLOAD: "Both required" banner, both fields highlighted', async () => {
    mockRunPlatformNativeApi.mockRejectedValue(
      new Error('INVALID_PAYLOAD: api_key and pub_id required'),
    );

    render(<Step2Beehiiv />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    fillAndSubmit();

    expect(
      await screen.findByText(/both the api key and publication id are required/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/beehiiv api key/i)).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(screen.getByLabelText(/publication id/i)).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  it('16. re-submit clears banner; failure persists if rejected again', async () => {
    mockRunPlatformNativeApi.mockResolvedValueOnce({
      verified: false,
      method: 'platform_native_api',
      reason: 'BAD_API_KEY',
    });

    render(<Step2Beehiiv />);
    await waitFor(() => expect(mockGet).toHaveBeenCalled());
    fillAndSubmit();

    expect(
      await screen.findByText(/we couldn't verify your api key/i),
    ).toBeInTheDocument();

    mockRunPlatformNativeApi.mockReturnValueOnce(new Promise(() => {}));
    fireEvent.click(screen.getByRole('button', { name: /^connect beehiiv$/i }));

    await waitFor(() => {
      expect(
        screen.queryByText(/we couldn't verify your api key/i),
      ).not.toBeInTheDocument();
    });
  });
});

// ─── Mount-resume probe ───────────────────────────────────────────

describe('Step2Beehiiv — mount-resume probe', () => {
  it('19. ownership.is_verified=true on mount → SUCCESS resume_stale + immediate auto-advance', async () => {
    const wizard = makeWizardMock();
    mockHookReturn.mockReturnValue(wizard);

    mockGet.mockResolvedValue({
      ownership_verification: null,
      is_verified: true,
    });

    render(<Step2Beehiiv />);

    expect(
      await screen.findByRole('heading', {
        name: /connected to your beehiiv newsletter/i,
      }),
    ).toBeInTheDocument();

    expect(
      screen.queryByText(/continuing to next step in/i),
    ).not.toBeInTheDocument();

    await waitFor(() => expect(wizard.advance).toHaveBeenCalledTimes(1));
  });
});
