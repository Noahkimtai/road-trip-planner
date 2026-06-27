import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSearch } from "../useSearch";

// ─── Mock services ───────────────────────────────────────────────────────────

vi.mock("../../services/mapService", () => ({
  mapService: {
    searchPlaces: vi.fn(),
    convertToSearchResult: vi.fn(),
  },
}));

vi.mock("../../services/api", () => ({
  apiService: {
    searchPlaces: vi.fn(),
  },
}));

import { apiService } from "../../services/api";
import { mapService } from "../../services/mapService";

const mockMap = mapService as {
  searchPlaces: ReturnType<typeof vi.fn>;
  convertToSearchResult: ReturnType<typeof vi.fn>;
};
const mockApi = apiService as { searchPlaces: ReturnType<typeof vi.fn> };

// ─── Shared fixture data ─────────────────────────────────────────────────────

const nairobiFeature = {
  id: "nominatim.1",
  text: "Nairobi",
  place_name: "Nairobi, Kenya",
  place_type: ["city"],
  center: [36.8219, -1.2921] as [number, number],
  relevance: 0.9,
  geometry: { type: "Point", coordinates: [36.8219, -1.2921] as [number, number] },
  properties: {},
};

const nairobiResult = {
  id: "nominatim.1",
  name: "Nairobi",
  address: "Nairobi, Kenya",
  lat: -1.2921,
  lng: 36.8219,
  type: "city",
  categories: ["city"],
  relevance: 0.9,
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("useSearch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts with empty results, no loading, and no error", () => {
    const { result } = renderHook(() => useSearch());
    expect(result.current.results).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("does not call any service when query is empty string", async () => {
    const { result } = renderHook(() => useSearch());
    await act(() => result.current.searchPlaces(""));
    expect(mockMap.searchPlaces).not.toHaveBeenCalled();
    expect(mockApi.searchPlaces).not.toHaveBeenCalled();
  });

  it("does not call any service when query is only whitespace", async () => {
    const { result } = renderHook(() => useSearch());
    await act(() => result.current.searchPlaces("   "));
    expect(mockMap.searchPlaces).not.toHaveBeenCalled();
  });

  it("populates results from mapService on success", async () => {
    mockMap.searchPlaces.mockResolvedValueOnce({
      type: "FeatureCollection",
      features: [nairobiFeature],
    });
    mockMap.convertToSearchResult.mockReturnValueOnce(nairobiResult);

    const { result } = renderHook(() => useSearch());
    await act(() => result.current.searchPlaces("Nairobi"));

    expect(result.current.results).toHaveLength(1);
    expect(result.current.results[0].name).toBe("Nairobi");
    expect(result.current.results[0].lat).toBeCloseTo(-1.2921);
  });

  it("is not loading after a successful search", async () => {
    mockMap.searchPlaces.mockResolvedValueOnce({
      type: "FeatureCollection",
      features: [nairobiFeature],
    });
    mockMap.convertToSearchResult.mockReturnValueOnce(nairobiResult);

    const { result } = renderHook(() => useSearch());
    await act(() => result.current.searchPlaces("Nairobi"));

    expect(result.current.isLoading).toBe(false);
  });

  it("clears error after a successful search", async () => {
    mockMap.searchPlaces.mockResolvedValueOnce({
      type: "FeatureCollection",
      features: [],
    });

    const { result } = renderHook(() => useSearch());
    await act(() => result.current.searchPlaces("ok"));

    expect(result.current.error).toBeNull();
  });

  it("falls back to apiService when mapService rejects", async () => {
    mockMap.searchPlaces.mockRejectedValueOnce(new Error("Nominatim down"));
    mockApi.searchPlaces.mockResolvedValueOnce({
      results: [
        {
          place_id: "api_1",
          name: "Mombasa",
          address: "Mombasa, Kenya",
          latitude: -4.0435,
          longitude: 39.6682,
          types: ["city"],
        },
      ],
    });

    const { result } = renderHook(() => useSearch());
    await act(() => result.current.searchPlaces("Mombasa"));

    expect(mockApi.searchPlaces).toHaveBeenCalledWith("Mombasa");
    expect(result.current.results).toHaveLength(1);
    expect(result.current.results[0].name).toBe("Mombasa");
    expect(result.current.error).toBeNull();
  });

  it("sets error when both services fail", async () => {
    mockMap.searchPlaces.mockRejectedValueOnce(new Error("map error"));
    mockApi.searchPlaces.mockRejectedValueOnce(new Error("api error"));

    const { result } = renderHook(() => useSearch());
    await act(() => result.current.searchPlaces("nowhere"));

    expect(result.current.error).toBe("Failed to search places");
    expect(result.current.results).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it("clearResults resets results and error to initial state", async () => {
    // First get some results
    mockMap.searchPlaces.mockResolvedValueOnce({
      type: "FeatureCollection",
      features: [nairobiFeature],
    });
    mockMap.convertToSearchResult.mockReturnValueOnce(nairobiResult);

    const { result } = renderHook(() => useSearch());
    await act(() => result.current.searchPlaces("Nairobi"));
    expect(result.current.results).toHaveLength(1);

    // Now clear
    act(() => result.current.clearResults());
    expect(result.current.results).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it("sets isLoading to true while the search is in-flight", async () => {
    let resolveMap!: (v: unknown) => void;
    mockMap.searchPlaces.mockReturnValueOnce(
      new Promise((res) => { resolveMap = res; })
    );

    const { result } = renderHook(() => useSearch());

    act(() => { result.current.searchPlaces("loading"); });

    // still in flight — loading should be true
    expect(result.current.isLoading).toBe(true);

    // resolve the promise
    await act(async () => {
      resolveMap({ type: "FeatureCollection", features: [] });
    });

    expect(result.current.isLoading).toBe(false);
  });

  it("passes country and limit options to mapService", async () => {
    mockMap.searchPlaces.mockResolvedValueOnce({
      type: "FeatureCollection",
      features: [],
    });

    const { result } = renderHook(() => useSearch());
    await act(() => result.current.searchPlaces("test"));

    expect(mockMap.searchPlaces).toHaveBeenCalledWith(
      "test",
      expect.objectContaining({ country: "ke", limit: 10 })
    );
  });
});
