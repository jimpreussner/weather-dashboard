export interface OpenMeteoResponse {
  minutely_15: {
    time: string[];
    temperature_2m: number[];
    precipitation: number[];
    wind_speed_10m: number[];
    shortwave_radiation: number[];
    direct_radiation: number[];
  };

  hourly: {
    time: string[];
    cloud_cover: number[];
  };
}