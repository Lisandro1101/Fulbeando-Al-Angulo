import { prefijosQueCubren } from "./app/src/core/geo/geohash";

const obelisco = { lat: -34.6037, lng: -58.3816 };
console.log("Team (5km):", prefijosQueCubren(obelisco, 5, 5));
console.log("Map (2km):", prefijosQueCubren(obelisco, 2, 5));
console.log("Map (10km):", prefijosQueCubren(obelisco, 10, 5));
console.log("Map (15km):", prefijosQueCubren(obelisco, 15, 5));
