import { getDatabase } from "../../../infra/database";
import {
  AwardsIntervalResult,
  ProducerInterval,
} from "../dtos/awards-interval";

export class GetAwardsIntervalService {
  private readonly db: ReturnType<typeof getDatabase>;

  constructor() {
    this.db = getDatabase();
  }

  public getAwardsInterval(): AwardsIntervalResult {
    const rows = this.db
      .prepare<
        [string],
        { year: number; producers: string }
      >("SELECT year, producers FROM movies WHERE winner = ? ORDER BY year")
      .all("yes");

    const winsByProducer = this.groupWinsByProducer(rows);
    const intervals = this.calculateIntervals(winsByProducer);

    return this.filterMinsAndMaxs(intervals);
  }

  private filterMinsAndMaxs(
    producerIntervals: ProducerInterval[],
  ): AwardsIntervalResult {
    if (producerIntervals.length === 0) {
      return { min: [], max: [] };
    }

    let minInterval = Infinity;
    let maxInterval = -Infinity;
    const minIntervals: ProducerInterval[] = [];
    const maxIntervals: ProducerInterval[] = [];

    for (const producerInterval of producerIntervals) {
      if (producerInterval.interval < minInterval) {
        minInterval = producerInterval.interval;
        minIntervals.length = 0; // esvazia o array
        minIntervals.push(producerInterval);
      } else if (producerInterval.interval === minInterval) {
        minIntervals.push(producerInterval);
      }

      if (producerInterval.interval > maxInterval) {
        maxInterval = producerInterval.interval;
        maxIntervals.length = 0; // esvazia o array
        maxIntervals.push(producerInterval);
      } else if (producerInterval.interval === maxInterval) {
        maxIntervals.push(producerInterval);
      }
    }

    return { min: minIntervals, max: maxIntervals };
  }

  private calculateIntervals(
    winsByProducer: Map<string, number[]>,
  ): ProducerInterval[] {
    const intervals: ProducerInterval[] = [];

    for (const [producer, wins] of winsByProducer) {
      if (wins.length < 2) continue;

      wins.sort((a, b) => a - b);

      for (let i = 1; i < wins.length; i++) {
        intervals.push({
          producer,
          // Asserts non-null já que sabemos que sempre vai haver um valor aqui devido à lógica do loop
          interval: wins[i]! - wins[i - 1]!,
          previousWin: wins[i - 1]!,
          followingWin: wins[i]!,
        });
      }
    }

    return intervals;
  }

  private groupWinsByProducer = (
    rows: { year: number; producers: string }[],
  ): Map<string, number[]> => {
    const winsByProducer = new Map<string, number[]>();

    for (const row of rows) {
      const producers = this.splitProducers(row.producers);
      for (const producer of producers) {
        const wins = winsByProducer.get(producer) ?? [];
        wins.push(row.year);
        winsByProducer.set(producer, wins);
      }
    }

    return winsByProducer;
  };

  private splitProducers(producers: string): string[] {
    return producers
      .replace(/,\s+and\s+/gi, ", ")
      .replace(/\s+and\s+/gi, ", ")
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
  }
}
