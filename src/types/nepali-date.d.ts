declare module "nepali-date" {
  class NepaliDate {
    constructor(value?: Date | string | number);
    constructor(year: number, month: number, day: number);
    getYear(): number;
    getMonth(): number;
    getDate(): number;
    getDay(): number;
    timestamp: number;
    format(formatStr: string): string;
  }
  export = NepaliDate;
}
