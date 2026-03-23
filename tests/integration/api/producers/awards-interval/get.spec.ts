import { buildApp } from "../../../../../src/app";
import path from "node:path";
import { loadCsvData } from "../../../../../src/startup/csv-loader";
import { closeDatabase } from "../../../../../src/infra/database";

const app = buildApp();

beforeAll(() => {
  loadCsvData(path.resolve(__dirname, "movielist.mock.csv"));
});

afterAll(() => {
  closeDatabase();
  app.close();
});

describe("GET /api/producers/awards-interval", () => {
  it("should return 200 with min and max intervals", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/producers/awards-interval",
    });

    expect(response.statusCode).toBe(200);

    const body = response.json();
    expect(body).toHaveProperty("min");
    expect(body).toHaveProperty("max");
    expect(Array.isArray(body.min)).toBe(true);
    expect(Array.isArray(body.max)).toBe(true);
  });

  it("should return correct schema for each interval entry", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/producers/awards-interval",
    });

    const body = response.json();

    for (const entry of [...body.min, ...body.max]) {
      expect(entry).toHaveProperty("producer");
      expect(entry).toHaveProperty("interval");
      expect(entry).toHaveProperty("previousWin");
      expect(entry).toHaveProperty("followingWin");
      expect(typeof entry.producer).toBe("string");
      expect(typeof entry.interval).toBe("number");
      expect(typeof entry.previousWin).toBe("number");
      expect(typeof entry.followingWin).toBe("number");
      expect(entry.followingWin - entry.previousWin).toBe(entry.interval);
    }
  });

  it("should have min interval <= max interval", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/producers/awards-interval",
    });

    const body = response.json();

    if (body.min.length > 0 && body.max.length > 0) {
      expect(body.min[0].interval).toBeLessThanOrEqual(body.max[0].interval);
    }
  });

  it("should return correct values for the provided CSV", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/producers/awards-interval",
    });

    const body = response.json();

    // Min: Joel Silver — interval 1 (1990 → 1991)
    expect(body.min).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          producer: "Joel Silver",
          interval: 1,
          previousWin: 1990,
          followingWin: 1991,
        }),
      ]),
    );

    // Max: Matthew Vaughn — interval 13 (2002 → 2015)
    expect(body.max).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          producer: "Matthew Vaughn",
          interval: 13,
          previousWin: 2002,
          followingWin: 2015,
        }),
      ]),
    );
  });
});
