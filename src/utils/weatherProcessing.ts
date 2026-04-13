import type { ProcessedWeatherSlice, TrackWeatherRaw } from "../types/weather";
import type { Track } from "../data/tracks";
import { resolveAsphaltParameters } from "../data/tracks";

const SIGMA = 5.670374419e-8; // Stefan-Boltzmann-Konstante W/(m² K⁴)
const ACTIVE_LAYER_DEPTH_M = 0.03; // angenommene thermisch aktive Asphaltschicht
const TIME_STEP_SECONDS = 15 * 60;

export function processWeather(
  data: TrackWeatherRaw,
  day: "today" | "tomorrow" | "dayAfter",
  track?: Track
): ProcessedWeatherSlice {
  const now = new Date();
  const baseDate = new Date(now);

  const debugRows: Array<{
    time: string;
    airTemp: number;
    asphaltTemp: number;
    equilibriumTemp: number;
    rain: number;
    wind: number;
    shortwave: number;
    direct: number;
    cloud: number;
    qSolar: number;
    qLongwaveIn: number;
    qLongwaveOut: number;
    qConv: number;
    qRain: number;
    qNet: number;
  }> = [];

  if (day === "tomorrow") baseDate.setDate(now.getDate() + 1);
  if (day === "dayAfter") baseDate.setDate(now.getDate() + 2);

  const start = new Date(baseDate);
  start.setHours(8, 0, 0, 0);

  const end = new Date(baseDate);
  end.setHours(20, 0, 0, 0);

  const times = data.minutely15.time;
  const temps = data.minutely15.temperature_2m;
  const rain = data.minutely15.precipitation;
  const wind = data.minutely15.wind_speed_10m;
  const shortwave = data.minutely15.shortwave_radiation;
  const direct = data.minutely15.direct_radiation;

  const hourlyTimes = data.hourly.time;
  const clouds = data.hourly.cloud_cover;

  if (!temps || !rain || !wind || !shortwave || !direct || !clouds) {
    throw new Error("Unvollständige Wetterdaten");
  }

  const asphaltParams = resolveAsphaltParameters(track);

  const result: ProcessedWeatherSlice = {
    time: [],
    temperature: [],
    precipitation: [],
    wind: [],
    asphaltTemp: [],
    directRadiation: [],
    cloudCover: [],
    radiationCoef: [],
  };

  let currentAsphaltTempC: number | null = null;

  console.log("processWeather called", {
    day,
    track: track?.name,
    timesLength: times?.length,
    firstTime: times?.[0],
    firstTimeType: typeof times?.[0],
    start,
    end,
  });

  for (let i = 0; i < times.length; i++) {
    const t = times[i];

    if (t >= start && t <= end) {
      const airTempC = temps[i];
      const rainMm = rain[i];
      const windSpeed = wind[i];
      const shortwaveRad = Math.max(0, shortwave[i]);
      const directRad = Math.max(0, direct[i]);
      const cloud = interpolateCloud(t, hourlyTimes, clouds);

      if (currentAsphaltTempC === null) {
        currentAsphaltTempC = getInitialAsphaltTemp(airTempC, directRad);
      }

      const step = updateAsphaltTemperature({
        currentSurfaceTempC: currentAsphaltTempC,
        airTempC,
        precipitationMm: rainMm,
        windSpeedMs: windSpeed,
        shortwaveRadiationWm2: shortwaveRad,
        cloudFraction: cloud,
        alpha: asphaltParams.alpha,
        epsilon: asphaltParams.epsilon,
        windFactor: asphaltParams.windFactor,
        rho: asphaltParams.rho,
        c: asphaltParams.c,
        dtSeconds: TIME_STEP_SECONDS,
        activeLayerDepthM: ACTIVE_LAYER_DEPTH_M,
      });

      currentAsphaltTempC = step.newSurfaceTempC;

      const radiationCoef =
        (2 * (shortwaveRad - directRad)) / Math.max(shortwaveRad + directRad, 1);

      result.time.push(t.toISOString());
      result.temperature.push(airTempC);
      result.precipitation.push(rainMm);
      result.wind.push(windSpeed);
      result.asphaltTemp.push(currentAsphaltTempC);
      result.directRadiation.push(directRad);
      result.cloudCover.push(cloud);
      result.radiationCoef.push(radiationCoef);

      debugRows.push({
        time: t.toISOString(),
        airTemp: round2(airTempC),
        asphaltTemp: round2(currentAsphaltTempC),
        equilibriumTemp: round2(step.equilibriumTempC),
        rain: round2(rainMm),
        wind: round2(windSpeed),
        shortwave: round2(shortwaveRad),
        direct: round2(directRad),
        cloud: round2(cloud),
        qSolar: round2(step.debug.qSolar),
        qLongwaveIn: round2(step.debug.qLongwaveIn),
        qLongwaveOut: round2(step.debug.qLongwaveOut),
        qConv: round2(step.debug.qConv),
        qRain: round2(step.debug.qRain),
        qNet: round2(step.debug.qNet),
      });
    }
  }
  console.log("debugRows length", debugRows.length);
  console.table(debugRows);
  return result;
}

type AsphaltStepInput = {
  currentSurfaceTempC: number;
  airTempC: number;
  precipitationMm: number;
  windSpeedMs: number;
  shortwaveRadiationWm2: number;
  cloudFraction: number;
  alpha: number;
  epsilon: number;
  windFactor: number;
  rho: number;
  c: number;
  dtSeconds: number;
  activeLayerDepthM: number;
};

type AsphaltStepResult = {
  newSurfaceTempC: number;
  equilibriumTempC: number;
  debug: {
    qSolar: number;
    qLongwaveIn: number;
    qLongwaveOut: number;
    qConv: number;
    qRain: number;
    qNet: number;
    h: number;
  };
};

function updateAsphaltTemperature(input: AsphaltStepInput): AsphaltStepResult {
  const airTempK = toKelvin(input.airTempC);
  const surfaceTempK = toKelvin(input.currentSurfaceTempC);

  const h = getConvectiveHeatTransferCoefficient(
    input.windSpeedMs,
    input.windFactor
  );

  const qSolar = (1 - input.alpha) * input.shortwaveRadiationWm2;

  const skyTempK = estimateSkyTemperatureKelvin(airTempK, input.cloudFraction);
  const qLongwaveIn = input.epsilon * SIGMA * Math.pow(skyTempK, 4);
  const qLongwaveOut = input.epsilon * SIGMA * Math.pow(surfaceTempK, 4);

  const qConv = h * (input.airTempC - input.currentSurfaceTempC);
  const qRain = getRainCoolingFlux(
    input.precipitationMm,
    input.currentSurfaceTempC,
    input.airTempC
  );

  const qNet = qSolar + qLongwaveIn - qLongwaveOut + qConv - qRain;

  const heatCapacityPerArea =
    input.rho * input.c * input.activeLayerDepthM;

  const deltaTempDirect = (qNet * input.dtSeconds) / heatCapacityPerArea;
  const directNextTemp = input.currentSurfaceTempC + deltaTempDirect;

  const equilibriumTempC =
    input.currentSurfaceTempC + qNet / Math.max(h + 12, 1);

  const tauSeconds = heatCapacityPerArea / Math.max(h + 12, 1);
  const relaxFactor = 1 - Math.exp(-input.dtSeconds / tauSeconds);

  const relaxedNextTemp =
    input.currentSurfaceTempC +
    (equilibriumTempC - input.currentSurfaceTempC) * relaxFactor;

  const newSurfaceTempC = clamp(
    0.5 * directNextTemp + 0.5 * relaxedNextTemp,
    -30,
    80
  );

  return {
    newSurfaceTempC,
    equilibriumTempC,
    debug: {
      qSolar,
      qLongwaveIn,
      qLongwaveOut,
      qConv,
      qRain,
      qNet,
      h,
    },
  };
}

function getInitialAsphaltTemp(airTempC: number, directRadiationWm2: number): number {
  return airTempC + 0.015 * directRadiationWm2;
}

function getConvectiveHeatTransferCoefficient(
  windSpeedMs: number,
  windFactor: number
): number {
  const v = Math.max(0, windSpeedMs) * Math.max(0.1, windFactor);

  return 5.6 + 4.0 * v;
}

function estimateSkyTemperatureKelvin(
  airTempK: number,
  cloudFraction: number
): number {
  const clearSkyOffsetK = 18;
  const cloudySkyOffsetK = 5;
  const offsetK =
    clearSkyOffsetK - (clearSkyOffsetK - cloudySkyOffsetK) * cloudFraction;

  return airTempK - offsetK;
}

function getRainCoolingFlux(
  precipitationMm: number,
  surfaceTempC: number,
  airTempC: number
): number {
  if (precipitationMm <= 0) return 0;

  const rainRateMps = (precipitationMm / 1000) / (15 * 60);
  const rhoWater = 1000;
  const cWater = 4186;
  const tempDiff = Math.max(0, surfaceTempC - airTempC);

  return rhoWater * cWater * rainRateMps * tempDiff;
}

function toKelvin(tempC: number): number {
  return tempC + 273.15;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function interpolateCloud(
  target: Date,
  hourlyTimes: Date[],
  clouds: Float32Array
): number {
  for (let i = 0; i < hourlyTimes.length - 1; i++) {
    const t0 = hourlyTimes[i];
    const t1 = hourlyTimes[i + 1];

    if (target >= t0 && target <= t1) {
      const ratio =
        (target.getTime() - t0.getTime()) /
        (t1.getTime() - t0.getTime());

      return (clouds[i] + (clouds[i + 1] - clouds[i]) * ratio) / 100;
    }
  }

  return clouds[clouds.length - 1] / 100;
}