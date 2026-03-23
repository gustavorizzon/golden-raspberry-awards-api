export interface ProducerInterval {
  producer: string;
  interval: number;
  previousWin: number;
  followingWin: number;
}

export interface AwardsIntervalResult {
  min: ProducerInterval[];
  max: ProducerInterval[];
}
