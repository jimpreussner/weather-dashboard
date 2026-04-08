export interface Track {
  name: string;
  lat: number;
  lon: number;
}

export const tracks: Track[] = [
  { name: "Sachsenring", lat: 50.79, lon: 12.69 },
  { name: "Lausitzring", lat: 51.53, lon: 13.93 },
  { name: "Autodrom Most", lat: 50.51884205271267, lon: 13.604885534091473},
  { name: "Hockenheimring", lat: 49.327, lon: 8.565 }
];