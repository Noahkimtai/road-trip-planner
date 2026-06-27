import { afterEach, describe, expect, it, vi } from "vitest";
import { mapService } from "../mapService";
import type { MapboxPlace } from "../mapService";

// Helper: stub fetch with a resolved response
const mockFetch = (body: unknown, ok = true) =>
  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
    ok,
    status: ok ? 200 : 500,
    json: () => Promise.resolve(body),
  } as unknown as Response);

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── Pure functions (no network calls) ──────────────────────────────────────

describe("decodePolyline", () => {
  it("returns an empty array for an empty string", () => {
    expect(mapService.decodePolyline("")).toEqual([]);
  });

  it("decodes the canonical polyline5 example to three points", () => {
    // "_p~iF~ps|U_ulLnnqC_mqNvxq`@" = [(38.5, -120.2), (40.7, -120.95), (43.252, -126.453)]
    const result = mapService.decodePolyline("_p~iF~ps|U_ulLnnqC_mqNvxq`@");
    expect(result).toHaveLength(3);
  });

  it("outputs [longitude, latitude] pairs (longitude first)", () => {
    // First decoded point: lat≈38.5, lng≈-120.2
    const [[lng, lat]] = mapService.decodePolyline("_p~iF~ps|U");
    expect(lat).toBeCloseTo(38.5, 0);
    expect(lng).toBeCloseTo(-120.2, 0);
  });

  it("decodes a single-point polyline", () => {
    // "??" = (0, 0) in polyline5
    const result = mapService.decodePolyline("??");
    expect(result).toHaveLength(1);
    expect(result[0][0]).toBeCloseTo(0, 5);
    expect(result[0][1]).toBeCloseTo(0, 5);
  });
});

// ─── convertToSearchResult ───────────────────────────────────────────────────

describe("convertToSearchResult", () => {
  const nairobi: MapboxPlace = {
    id: "nominatim.42",
    text: "Nairobi",
    place_name: "Nairobi, Kenya",
    place_type: ["city", "place"],
    relevance: 0.9,
    center: [36.8219, -1.2921],
    geometry: { type: "Point", coordinates: [36.8219, -1.2921] },
    properties: {},
  };

  it("maps text to name", () => {
    expect(mapService.convertToSearchResult(nairobi).name).toBe("Nairobi");
  });

  it("maps place_name to address", () => {
    expect(mapService.convertToSearchResult(nairobi).address).toBe(
      "Nairobi, Kenya"
    );
  });

  it("extracts longitude as lng from center[0]", () => {
    expect(mapService.convertToSearchResult(nairobi).lng).toBeCloseTo(36.8219);
  });

  it("extracts latitude as lat from center[1]", () => {
    expect(mapService.convertToSearchResult(nairobi).lat).toBeCloseTo(-1.2921);
  });

  it("uses the first place_type as type", () => {
    expect(mapService.convertToSearchResult(nairobi).type).toBe("city");
  });

  it("passes relevance through unchanged", () => {
    expect(mapService.convertToSearchResult(nairobi).relevance).toBe(0.9);
  });
});

// ─── getStaticMapUrl / getSimpleMapUrl ───────────────────────────────────────

describe("static map stub methods", () => {
  it("getStaticMapUrl always returns an empty string", () => {
    expect(mapService.getStaticMapUrl({})).toBe("");
    expect(mapService.getStaticMapUrl({ zoom: 12 })).toBe("");
  });

  it("getSimpleMapUrl always returns an empty string", () => {
    expect(mapService.getSimpleMapUrl({})).toBe("");
  });
});

// ─── searchPlaces ────────────────────────────────────────────────────────────

describe("searchPlaces", () => {
  it("returns a FeatureCollection wrapping Nominatim results", async () => {
    mockFetch([
      {
        place_id: 1,
        lat: "-1.2921",
        lon: "36.8219",
        display_name: "Nairobi, Kenya",
        name: "Nairobi",
        type: "city",
        class: "place",
        importance: 0.9,
      },
    ]);

    const result = await mapService.searchPlaces("Nairobi");

    expect(result.type).toBe("FeatureCollection");
    expect(result.features).toHaveLength(1);
  });

  it("assigns the nominatim id as 'nominatim.<place_id>'", async () => {
    mockFetch([
      {
        place_id: 99,
        lat: "-1.2921",
        lon: "36.8219",
        display_name: "Nairobi, Kenya",
        name: "Nairobi",
        type: "city",
        class: "place",
        importance: 0.9,
      },
    ]);

    const result = await mapService.searchPlaces("Nairobi");
    expect(result.features[0].id).toBe("nominatim.99");
  });

  it("sets center as [longitude, latitude]", async () => {
    mockFetch([
      {
        place_id: 1,
        lat: "-1.2921",
        lon: "36.8219",
        display_name: "Nairobi, Kenya",
        name: "Nairobi",
        type: "city",
        class: "place",
        importance: 0.9,
      },
    ]);

    const result = await mapService.searchPlaces("Nairobi");
    const [lng, lat] = result.features[0].center;
    expect(lng).toBeCloseTo(36.8219);
    expect(lat).toBeCloseTo(-1.2921);
  });

  it("throws when Nominatim returns a non-ok status", async () => {
    mockFetch({}, false);
    await expect(mapService.searchPlaces("fail")).rejects.toThrow(
      /Nominatim search error/
    );
  });

  it("passes the limit option to the query string", async () => {
    const spy = mockFetch([]);
    await mapService.searchPlaces("test", { limit: 5 });
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("limit=5"),
      expect.anything()
    );
  });

  it("passes country code to the query string", async () => {
    const spy = mockFetch([]);
    await mapService.searchPlaces("test", { country: "ke" });
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("countrycodes=ke"),
      expect.anything()
    );
  });
});

// ─── reverseGeocode ──────────────────────────────────────────────────────────

describe("reverseGeocode", () => {
  it("wraps a single Nominatim result in a FeatureCollection", async () => {
    mockFetch({
      place_id: 5,
      lat: "-1.2921",
      lon: "36.8219",
      display_name: "Nairobi, Kenya",
      name: "Nairobi",
      type: "city",
      class: "place",
      importance: 0.9,
    });

    const result = await mapService.reverseGeocode(36.8219, -1.2921);
    expect(result.features).toHaveLength(1);
    expect(result.features[0].place_name).toBe("Nairobi, Kenya");
  });

  it("throws on non-ok response", async () => {
    mockFetch({}, false);
    await expect(mapService.reverseGeocode(0, 0)).rejects.toThrow(
      /Nominatim reverse geocode error/
    );
  });
});

// ─── getDirections ───────────────────────────────────────────────────────────

describe("getDirections", () => {
  const osrmOk = {
    code: "Ok",
    routes: [
      {
        geometry: "enc_polyline",
        legs: [{ distance: 5000, duration: 600, steps: [] }],
        distance: 5000,
        duration: 600,
      },
    ],
    waypoints: [
      { name: "A", location: [36.8, -1.3] },
      { name: "B", location: [37.0, -1.0] },
    ],
  };

  it("returns correctly shaped MapboxDirectionsResponse", async () => {
    mockFetch(osrmOk);
    const result = await mapService.getDirections(
      [[36.8, -1.3], [37.0, -1.0]]
    );
    expect(result.code).toBe("Ok");
    expect(result.routes[0].distance).toBe(5000);
    expect(result.routes[0].legs[0].duration).toBe(600);
  });

  it("maps 'driving-traffic' profile to the 'driving' OSRM path segment", async () => {
    const spy = mockFetch(osrmOk);
    await mapService.getDirections([[0, 0], [1, 1]], {
      profile: "driving-traffic",
    });
    // OSRM fetch is called with URL only (no options object)
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("/route/v1/driving/")
    );
  });

  it("maps 'walking' profile to 'foot' in the OSRM path", async () => {
    const spy = mockFetch(osrmOk);
    await mapService.getDirections([[0, 0], [1, 1]], { profile: "walking" });
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("/route/v1/foot/")
    );
  });

  it("maps 'cycling' profile to 'bike' in the OSRM path", async () => {
    const spy = mockFetch(osrmOk);
    await mapService.getDirections([[0, 0], [1, 1]], { profile: "cycling" });
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("/route/v1/bike/")
    );
  });

  it("throws when OSRM returns code other than Ok", async () => {
    mockFetch({ code: "NoRoute", message: "Could not find route" });
    await expect(
      mapService.getDirections([[0, 0], [1, 1]])
    ).rejects.toThrow(/OSRM routing failed/);
  });

  it("throws on non-ok HTTP status", async () => {
    mockFetch({}, false);
    await expect(
      mapService.getDirections([[0, 0], [1, 1]])
    ).rejects.toThrow(/OSRM error/);
  });

  it("populates waypoints from the OSRM response", async () => {
    mockFetch(osrmOk);
    const result = await mapService.getDirections([[0, 0], [1, 1]]);
    expect(result.waypoints).toHaveLength(2);
    expect(result.waypoints[0].name).toBe("A");
  });
});
