export interface Track {
  name: string;
  lat: number;
  lon: number;
}

export const tracks: Track[] = [
  { name: "FS Czech", lat: 50.51884205271267, lon: 13.604885534091473},
  { name: "FS Freital", lat: 51.00307024827095, lon: 13.635912669543},
  { name: "FS Austria", lat: 47.221320912541664, lon: 14.762632556193969},
  { name: "FS East (Hungaroring)", lat: 47.58035314980727, lon: 19.249563651526643},
  { name: "VDE E-Race", lat: 53.09673113139393, lon: 14.325061409266697},
  { name: "FS Netherlands", lat: 52.957642240257805, lon: 6.525882513435619},
  { name: "FS Switzerland", lat: 46.50204377450582, lon: 8.299866965030827},
  { name: "FS East (ZalaZone)", lat: 46.89503895667208, lon: 16.843557985060553},
  { name: "FS Germany", lat: 49.33056050531237, lon: 8.565524837436797 }
];