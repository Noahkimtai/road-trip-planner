import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { apiService } from "../api";

// Silence toast side-effects
vi.mock("../toast", () => ({
  toastService: {
    api: {
      loginSuccess: vi.fn(),
      loginFailed: vi.fn(),
      logoutSuccess: vi.fn(),
      tripDeleted: vi.fn(),
    },
    error: vi.fn(),
    success: vi.fn(),
  },
}));

// Helper: stub globalThis.fetch with a one-shot resolved response
const mockFetch = (body: unknown, ok = true, statusCode = 200) =>
  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
    ok,
    status: statusCode,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
    headers: { get: () => "application/json" },
  } as unknown as Response);

// Helper: stub fetch with a one-shot network error
const mockFetchError = (msg = "Network error") =>
  vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error(msg));

describe("ApiService", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── register ───────────────────────────────────────────────────────────

  describe("register", () => {
    it("stores access and refresh tokens on success", async () => {
      mockFetch({
        tokens: { access: "acc_123", refresh: "ref_456" },
        user: { id: 1, email: "new@example.com" },
      });

      await apiService.register({
        email: "new@example.com",
        username: "newuser",
        first_name: "New",
        last_name: "User",
        password: "pass",
        password_confirm: "pass",
      });

      expect(localStorage.getItem("access_token")).toBe("acc_123");
      expect(localStorage.getItem("refresh_token")).toBe("ref_456");
    });

    it("returns the full server response", async () => {
      const serverData = {
        tokens: { access: "a", refresh: "r" },
        user: { id: 2, email: "u@example.com" },
      };
      mockFetch(serverData);

      const result = await apiService.register({
        email: "u@example.com",
        username: "u",
        first_name: "U",
        last_name: "U",
        password: "p",
        password_confirm: "p",
      });

      expect(result).toEqual(serverData);
    });

    it("throws with server error message on 400", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: "Email already in use" }),
      } as unknown as Response);

      await expect(
        apiService.register({
          email: "dup@example.com",
          username: "dup",
          first_name: "D",
          last_name: "D",
          password: "p",
          password_confirm: "p",
        })
      ).rejects.toThrow("Email already in use");
    });
  });

  // ─── login ──────────────────────────────────────────────────────────────

  describe("login", () => {
    it("stores tokens in localStorage on success", async () => {
      mockFetch({
        tokens: { access: "acc_login", refresh: "ref_login" },
        user: { first_name: "Alice" },
      });

      await apiService.login("alice@example.com", "password");

      expect(localStorage.getItem("access_token")).toBe("acc_login");
      expect(localStorage.getItem("refresh_token")).toBe("ref_login");
    });

    it("throws when credentials are wrong", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: "Invalid email or password" }),
      } as unknown as Response);

      await expect(
        apiService.login("bad@example.com", "wrong")
      ).rejects.toThrow("Invalid email or password");
    });
  });

  // ─── logout ─────────────────────────────────────────────────────────────

  describe("logout", () => {
    it("clears both tokens from localStorage", async () => {
      localStorage.setItem("access_token", "old_access");
      localStorage.setItem("refresh_token", "old_refresh");
      mockFetch({ message: "logged out" });

      await apiService.logout();

      expect(localStorage.getItem("access_token")).toBeNull();
      expect(localStorage.getItem("refresh_token")).toBeNull();
    });

    it("still clears tokens even if the server call fails", async () => {
      localStorage.setItem("access_token", "tok");
      localStorage.setItem("refresh_token", "ref");
      mockFetchError("server down");

      await apiService.logout();

      // Tokens should still be removed
      expect(localStorage.getItem("access_token")).toBeNull();
    });
  });

  // ─── getTrips ───────────────────────────────────────────────────────────

  describe("getTrips", () => {
    it("returns the trips array on success", async () => {
      const trips = [{ id: 1, name: "Road Trip" }];
      localStorage.setItem("access_token", "valid");
      mockFetch(trips);

      const result = await apiService.getTrips();
      expect(result).toEqual(trips);
    });

    it("returns empty results object on network failure", async () => {
      mockFetchError();

      const result = await apiService.getTrips();
      expect(result).toEqual({ results: [] });
    });
  });

  // ─── createTrip ─────────────────────────────────────────────────────────

  describe("createTrip", () => {
    it("sends a POST to /trips/ with the trip data", async () => {
      const created = { id: 7, name: "Adventure" };
      const spy = mockFetch(created);
      localStorage.setItem("access_token", "valid");

      const result = await apiService.createTrip({ name: "Adventure" });

      expect(result).toEqual(created);
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining("/trips/"),
        expect.objectContaining({ method: "POST" })
      );
    });

    it("throws when the server returns an error", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ detail: "Bad request" }),
      } as unknown as Response);

      await expect(apiService.createTrip({ name: "" })).rejects.toThrow(
        "Bad request"
      );
    });
  });

  // ─── deleteTrip ─────────────────────────────────────────────────────────

  describe("deleteTrip", () => {
    it("returns null for a 204 No Content response", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        status: 204,
        headers: { get: () => null },
      } as unknown as Response);
      localStorage.setItem("access_token", "valid");

      const result = await apiService.deleteTrip(1);
      expect(result).toBeNull();
    });

    it("throws when the delete fails", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ detail: "Not found" }),
      } as unknown as Response);

      await expect(apiService.deleteTrip(999)).rejects.toThrow("Not found");
    });
  });

  // ─── calculateRoute (mock fallback) ─────────────────────────────────────

  describe("calculateRoute (mock fallback)", () => {
    it("returns mock data when API is unreachable", async () => {
      mockFetchError();
      localStorage.setItem("access_token", "valid");

      const result = await apiService.calculateRoute([
        { lat: 0, lng: 0 },
        { lat: 1, lng: 1 },
      ]);

      expect(result).toHaveProperty("totalDistance");
      expect(result).toHaveProperty("totalTime");
    });

    it("mock distance scales with number of waypoints", async () => {
      mockFetchError();
      localStorage.setItem("access_token", "valid");

      // mock formula: waypoints.length × 150 = 3 × 150 = 450
      const result = await apiService.calculateRoute([
        { lat: 0, lng: 0 },
        { lat: 1, lng: 1 },
        { lat: 2, lng: 2 },
      ]);

      expect(result.totalDistance).toBe(450);
    });

    it("returns zero distance for a single waypoint", async () => {
      mockFetchError();
      localStorage.setItem("access_token", "valid");

      const result = await apiService.calculateRoute([{ lat: 0, lng: 0 }]);

      expect(result.totalDistance).toBe(0);
    });
  });

  // ─── addStopToTrip ──────────────────────────────────────────────────────

  describe("addStopToTrip", () => {
    it("sends POST to correct stops endpoint", async () => {
      const stop = { id: 10, name: "Nairobi" };
      const spy = mockFetch(stop);
      localStorage.setItem("access_token", "valid");

      const result = await apiService.addStopToTrip(5, {
        name: "Nairobi",
        address: "Nairobi, Kenya",
        latitude: -1.2921,
        longitude: 36.8219,
      });

      expect(result).toEqual(stop);
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining("/trips/5/stops/"),
        expect.objectContaining({ method: "POST" })
      );
    });
  });
});
