import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the underlying edgeFetch helper so we can control responses
// without hitting the network.
const mockEdgeFetch = vi.fn();
vi.mock("./api", () => ({
  edgeFetch: (...args: unknown[]) => mockEdgeFetch(...args),
}));

import {
  getBuyerAccount,
  signupBuyer,
  createBuyerKey,
  revokeBuyerKey,
  patchBuyer,
} from "./buyerApi";

beforeEach(() => {
  mockEdgeFetch.mockReset();
});

describe("buyerApi", () => {
  describe("getBuyerAccount", () => {
    it("returns the profile when the request succeeds", async () => {
      mockEdgeFetch.mockResolvedValueOnce({
        buyer: { id: "b1", name: "Test", organization: null, contact_email: "t@x.com", accepted_terms_at: null, terms_version: null, created_at: "2026-05-01T00:00:00Z" },
        keys: [],
      });
      const profile = await getBuyerAccount("jwt-token");
      expect(profile?.buyer.id).toBe("b1");
      expect(mockEdgeFetch).toHaveBeenCalledWith(
        "https://api.opedd.com/buyer-account",
        { method: "GET" },
        "jwt-token",
      );
    });

    it("returns null when the backend says 'no buyer account' (post-α-bis 404 path)", async () => {
      mockEdgeFetch.mockRejectedValueOnce(
        new Error("No buyer account — POST { action: 'signup', ... } first"),
      );
      const profile = await getBuyerAccount("jwt-token");
      expect(profile).toBeNull();
    });

    it("rethrows on actual auth errors (401-shape)", async () => {
      mockEdgeFetch.mockRejectedValueOnce(new Error("Authorization: Bearer <jwt> required"));
      await expect(getBuyerAccount("jwt-token")).rejects.toThrow(/Authorization/);
    });
  });

  describe("signupBuyer", () => {
    it("posts the signup action with all required fields", async () => {
      mockEdgeFetch.mockResolvedValueOnce({
        buyer: { id: "b1", name: "n", organization: null, contact_email: "x@y.com", accepted_terms_at: null, terms_version: "v1", created_at: "" },
        key: "opedd_buyer_live_abc",
        key_id: "k1",
        key_prefix: "abc",
        environment: "live",
      });
      await signupBuyer("jwt", {
        name: "Jane",
        organization: "Acme",
        contact_email: "jane@acme.example",
        terms_version: "2026-05-01",
      });
      expect(mockEdgeFetch).toHaveBeenCalledWith(
        "https://api.opedd.com/buyer-account",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            action: "signup",
            name: "Jane",
            organization: "Acme",
            contact_email: "jane@acme.example",
            terms_version: "2026-05-01",
          }),
        }),
        "jwt",
      );
    });
  });

  describe("createBuyerKey", () => {
    it("posts the create_key action with name + environment", async () => {
      mockEdgeFetch.mockResolvedValueOnce({
        key: "opedd_buyer_test_xyz",
        key_id: "k2",
        key_prefix: "xyz",
        environment: "test",
        name: "Sandbox",
      });
      await createBuyerKey("jwt", { name: "Sandbox", environment: "test" });
      expect(mockEdgeFetch).toHaveBeenCalledWith(
        "https://api.opedd.com/buyer-account",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ action: "create_key", name: "Sandbox", environment: "test" }),
        }),
        "jwt",
      );
    });

    it("defaults to no params when called bare", async () => {
      mockEdgeFetch.mockResolvedValueOnce({});
      await createBuyerKey("jwt");
      const callBody = JSON.parse((mockEdgeFetch.mock.calls[0][1] as { body: string }).body);
      expect(callBody.action).toBe("create_key");
      expect(callBody.name).toBeUndefined();
    });
  });

  describe("revokeBuyerKey", () => {
    it("passes immediate flag through", async () => {
      mockEdgeFetch.mockResolvedValueOnce({
        key_id: "k1",
        revoked_at: "2026-05-01T00:00:00Z",
        effective_at: "2026-05-01T00:00:00Z",
        immediate: true,
      });
      await revokeBuyerKey("jwt", { key_id: "k1", immediate: true });
      const body = JSON.parse((mockEdgeFetch.mock.calls[0][1] as { body: string }).body);
      expect(body).toEqual({ action: "revoke_key", key_id: "k1", immediate: true });
    });
  });

  describe("patchBuyer", () => {
    it("uses PATCH method with the supplied fields", async () => {
      mockEdgeFetch.mockResolvedValueOnce({ buyer: { id: "b1", name: "Updated", organization: "Acme", contact_email: "x@y.com", accepted_terms_at: null, terms_version: null, public_attribution_consent: false, created_at: "" } });
      await patchBuyer("jwt", { name: "Updated", organization: "Acme" });
      expect(mockEdgeFetch).toHaveBeenCalledWith(
        "https://api.opedd.com/buyer-account",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ name: "Updated", organization: "Acme" }),
        }),
        "jwt",
      );
    });

    it("forwards public_attribution_consent flag (Phase 5.3-attribution)", async () => {
      mockEdgeFetch.mockResolvedValueOnce({ buyer: { id: "b1", name: "x", organization: null, contact_email: "x@y.com", accepted_terms_at: null, terms_version: null, public_attribution_consent: true, created_at: "" } });
      await patchBuyer("jwt", { public_attribution_consent: true });
      const callBody = JSON.parse((mockEdgeFetch.mock.calls[0][1] as { body: string }).body);
      expect(callBody).toEqual({ public_attribution_consent: true });
    });
  });
});
