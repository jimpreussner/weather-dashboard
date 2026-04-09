// types/weather.ts
export type WeatherModel =
  | "best_match"
  | "icon_d2"
  | "icon_eu"
  | "ecmwf_ifs04"
  | "gfs_global";

export interface WeatherSeries15Min {
  time: Date[];
  temperature_2m: Float32Array | null;
  precipitation: Float32Array | null;
  wind_speed_10m: Float32Array | null;
  shortwave_radiation: Float32Array | null;
  direct_radiation: Float32Array | null;
}

export interface WeatherSeriesHourly {
  time: Date[];
  cloud_cover: Float32Array | null;
}

export interface TrackWeatherRaw {
  trackName: string;
  model: WeatherModel;
  latitude: number;
  longitude: number;
  elevation: number;
  utcOffsetSeconds: number;
  timezone: string;
  minutely15: WeatherSeries15Min;
  hourly: WeatherSeriesHourly;
}

export interface ProcessedWeatherSlice {
  time: string[];
  temperature: number[];
  precipitation: number[];
  wind: number[];
  asphaltTemp: number[];
  directRadiation: number[];
  cloudCover: number[];
  radiationCoef: number[];
}