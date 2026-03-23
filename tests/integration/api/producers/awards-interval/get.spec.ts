import { buildApp } from "../../../../../src/app";
import path from "node:path";
import { loadCsvData } from "../../../../../src/startup/csv-loader";
import { closeDatabase, getDatabase } from "../../../../../src/infra/database";

const app = buildApp();
const db = getDatabase();

describe("GET /api/producers/awards-interval", () => {
  afterAll(async () => {
    closeDatabase();
    await app.close();
  });

  describe("With Mocked CSV Data", () => {
    beforeAll(() => {
      loadCsvData(path.resolve(__dirname, "movielist.mock.csv"));
    });

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

      // Min: Joel Silver - interval 1 (1990 -> 1991)
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

      // Max: Matthew Vaughn - interval 13 (2002 -> 2015)
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

  describe("Edge Cases", () => {
    const resetDatabase = () => {
      db.exec("DELETE FROM movies");
    };

    const insertMovies = (
      movies: {
        year: number;
        title: string;
        producers: string;
        winner: boolean;
      }[],
    ) => {
      const insert = db.prepare(
        "INSERT INTO movies (year, title, studios, producers, winner) VALUES (?, ?, ?, ?, ?)",
      );
      for (const movie of movies) {
        insert.run(
          movie.year,
          movie.title,
          "Studio X",
          movie.producers,
          movie.winner ? "yes" : null,
        );
      }
    };

    beforeEach(() => {
      resetDatabase();
    });

    it("should return empty arrays when no producer has multiple wins", async () => {
      insertMovies([
        { year: 2000, title: "Movie A", producers: "Producer A", winner: true },
        { year: 2001, title: "Movie B", producers: "Producer B", winner: true },
        { year: 2002, title: "Movie C", producers: "Producer C", winner: true },
      ]);

      const response = await app.inject({
        method: "GET",
        url: "/api/producers/awards-interval",
      });

      const body = response.json();
      expect(response.statusCode).toBe(200);
      expect(body.min).toEqual([]);
      expect(body.max).toEqual([]);
    });

    it("should return empty arrays when there are no winners", async () => {
      insertMovies([
        {
          year: 2000,
          title: "Movie A",
          producers: "Producer A",
          winner: false,
        },
        {
          year: 2001,
          title: "Movie B",
          producers: "Producer A",
          winner: false,
        },
      ]);

      const response = await app.inject({
        method: "GET",
        url: "/api/producers/awards-interval",
      });

      const body = response.json();
      expect(response.statusCode).toBe(200);
      expect(body.min).toEqual([]);
      expect(body.max).toEqual([]);
    });

    it('should correctly split producers separated by "and"', async () => {
      insertMovies([
        {
          year: 2000,
          title: "Movie A",
          producers: "Alpha and Beta",
          winner: true,
        },
        { year: 2005, title: "Movie B", producers: "Alpha", winner: true },
        { year: 2006, title: "Movie C", producers: "Beta", winner: true },
      ]);

      const response = await app.inject({
        method: "GET",
        url: "/api/producers/awards-interval",
      });

      const body = response.json();

      expect(body.min).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ producer: "Alpha", interval: 5 }),
        ]),
      );

      expect(body.max).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ producer: "Beta", interval: 6 }),
        ]),
      );
    });

    it("should handle a producer with 3+ wins and return consecutive intervals", async () => {
      insertMovies([
        { year: 2000, title: "Movie A", producers: "Producer A", winner: true },
        { year: 2003, title: "Movie B", producers: "Producer A", winner: true },
        { year: 2010, title: "Movie C", producers: "Producer A", winner: true },
      ]);

      const response = await app.inject({
        method: "GET",
        url: "/api/producers/awards-interval",
      });

      const body = response.json();

      // Min: 2000->2003 = 3
      expect(body.min).toEqual([
        expect.objectContaining({
          producer: "Producer A",
          interval: 3,
          previousWin: 2000,
          followingWin: 2003,
        }),
      ]);

      // Max: 2003->2010 = 7
      expect(body.max).toEqual([
        expect.objectContaining({
          producer: "Producer A",
          interval: 7,
          previousWin: 2003,
          followingWin: 2010,
        }),
      ]);
    });

    it("should return all tied producers when multiple share the same min or max interval", async () => {
      insertMovies([
        { year: 2000, title: "Movie A", producers: "Producer A", winner: true },
        { year: 2001, title: "Movie B", producers: "Producer A", winner: true },
        { year: 2010, title: "Movie C", producers: "Producer B", winner: true },
        { year: 2011, title: "Movie D", producers: "Producer B", winner: true },
      ]);

      const response = await app.inject({
        method: "GET",
        url: "/api/producers/awards-interval",
      });

      const body = response.json();

      // Ambos tem intervalo 1 - eles devem aparecer tanto em min quanto em max
      expect(body.min).toHaveLength(2);
      expect(body.max).toHaveLength(2);
    });
  });
});
