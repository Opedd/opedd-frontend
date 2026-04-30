import { describe, it, expect } from "vitest";
import { __test } from "./usePublication";

const { deriveCTA, deriveName, aggregateContentSources } = __test;

describe("usePublication helpers", () => {
  describe("deriveCTA", () => {
    it("returns get_started for prospect", () => {
      expect(
        deriveCTA({
          setupState: "prospect",
          setupComplete: false,
          verificationStatus: "pending",
          licenseCount: 0,
        }),
      ).toBe("get_started");
    });

    it("returns continue_setup for in_setup", () => {
      expect(
        deriveCTA({
          setupState: "in_setup",
          setupComplete: false,
          verificationStatus: "pending",
          licenseCount: 0,
        }),
      ).toBe("continue_setup");
    });

    it("OQ-C: returns continue_setup when verified+setup_complete=false (the c3fb155f case)", () => {
      expect(
        deriveCTA({
          setupState: "in_setup",
          setupComplete: false,
          verificationStatus: "verified",
          licenseCount: 21,
        }),
      ).toBe("continue_setup");
    });

    it("returns import_content when verified+complete+licenseCount=0", () => {
      expect(
        deriveCTA({
          setupState: "verified",
          setupComplete: true,
          verificationStatus: "verified",
          licenseCount: 0,
        }),
      ).toBe("import_content");
    });

    it("returns view_licenses when verified+complete+licenseCount>0", () => {
      expect(
        deriveCTA({
          setupState: "connected",
          setupComplete: true,
          verificationStatus: "verified",
          licenseCount: 20,
        }),
      ).toBe("view_licenses");
    });

    it("returns contact_support for suspended verification", () => {
      expect(
        deriveCTA({
          setupState: "verified",
          setupComplete: true,
          verificationStatus: "suspended",
          licenseCount: 0,
        }),
      ).toBe("contact_support");
    });

    it("returns contact_support for suspended setup_state", () => {
      expect(
        deriveCTA({
          setupState: "suspended",
          setupComplete: true,
          verificationStatus: "verified",
          licenseCount: 0,
        }),
      ).toBe("contact_support");
    });
  });

  describe("deriveName", () => {
    it("uses branding_data.name when present", () => {
      expect(deriveName({ name: "Matter of fact" }, null)).toBe("Matter of fact");
    });

    it("falls back to URL hostname stripped of www", () => {
      expect(deriveName({}, "https://www.opedd.substack.com")).toBe(
        "opedd.substack.com",
      );
    });

    it("falls back to URL hostname when branding empty", () => {
      expect(deriveName(null, "https://opedd.substack.com")).toBe(
        "opedd.substack.com",
      );
    });

    it("falls back to generic when both branding and URL are missing", () => {
      expect(deriveName(null, null)).toBe("Your publication");
    });

    it("ignores empty-string branding name", () => {
      expect(deriveName({ name: "  " }, "https://opedd.substack.com")).toBe(
        "opedd.substack.com",
      );
    });
  });

  describe("aggregateContentSources (OQ-E rule)", () => {
    it("returns null for empty rows", () => {
      expect(aggregateContentSources([])).toBeNull();
    });

    it("returns the single row when only one exists", () => {
      const result = aggregateContentSources([
        {
          id: "1",
          url: "https://opedd.substack.com",
          last_sync_at: "2026-03-18T14:11:49.000Z",
          sync_status: "active",
          created_at: "2026-03-18T14:11:48.000Z",
        },
      ]);
      expect(result).toEqual({
        last_sync_at: "2026-03-18T14:11:49.000Z",
        sync_status: "active",
        url: "https://opedd.substack.com",
        rowCount: 1,
      });
    });

    it("OQ-E: most-recent last_sync_at wins for dual rows", () => {
      const result = aggregateContentSources([
        {
          id: "older",
          url: "https://opedd.substack.com/feed",
          last_sync_at: "2026-03-18T14:11:49.000Z",
          sync_status: "protected",
          created_at: "2026-03-18T14:11:48.000Z",
        },
        {
          id: "newer",
          url: "https://opedd.substack.com",
          last_sync_at: "2026-04-30T10:00:00.000Z",
          sync_status: "active",
          created_at: "2026-04-30T07:47:00.000Z",
        },
      ]);
      expect(result?.url).toBe("https://opedd.substack.com");
      expect(result?.sync_status).toBe("active");
      expect(result?.rowCount).toBe(2);
    });

    it("OQ-E tie-break: when last_sync_at ties, created_at desc wins", () => {
      const result = aggregateContentSources([
        {
          id: "older",
          url: "https://a.example.com",
          last_sync_at: null,
          sync_status: "error",
          created_at: "2026-03-18T14:11:48.000Z",
        },
        {
          id: "newer",
          url: "https://b.example.com",
          last_sync_at: null,
          sync_status: "error",
          created_at: "2026-04-30T07:47:00.000Z",
        },
      ]);
      expect(result?.url).toBe("https://b.example.com");
    });

    it("c3fb155f real shape: dual rows, both with non-null last_sync_at where one is much older", () => {
      // Row A: Phase 4.5 auto-create, never synced (last_sync_at=null)
      // Row B: 2026-03-18 legacy RSS connect (last_sync_at populated)
      const result = aggregateContentSources([
        {
          id: "auto",
          url: "https://opedd.substack.com",
          last_sync_at: null,
          sync_status: "error",
          created_at: "2026-04-30T07:47:00.987Z",
        },
        {
          id: "legacy",
          url: "https://opedd.substack.com/feed",
          last_sync_at: "2026-03-18T14:11:49.000Z",
          sync_status: "protected",
          created_at: "2026-03-18T14:11:48.000Z",
        },
      ]);
      // Legacy wins because its last_sync_at is non-null.
      expect(result?.url).toBe("https://opedd.substack.com/feed");
      expect(result?.last_sync_at).toBe("2026-03-18T14:11:49.000Z");
      expect(result?.rowCount).toBe(2);
    });
  });
});
