/** Race content, with one carefully composed coastal circuit per level. */
export interface ObstacleSpec {
  t: number;
  offset: number;
  radius: number;
}
export interface Level {
  id: number;
  name: string;
  subtitle: string;
  difficulty: string;
  description: string;
  roadWidth: number;
  timeLimit: number;
  accent: string;
  obstacles: readonly ObstacleSpec[];
  sand: readonly (readonly [number, number])[];
}
export const LEVELS: readonly Level[] = [
  {
    id: 0,
    name: "Circuito da Costa",
    subtitle: "Encontre o seu ritmo",
    difficulty: "TRANQUILO",
    description: "Curvas amplas, pista livre e tempo para aprender a costa.",
    roadWidth: 12,
    timeLimit: 120,
    accent: "#df7558",
    obstacles: [],
    sand: [],
  },
  {
    id: 1,
    name: "Enseada das Rochas",
    subtitle: "Escolha sua trajetória",
    difficulty: "INTERMEDIÁRIO",
    description:
      "Uma nova enseada: curvas em sequência e rochas na pista. Antecipe o freio.",
    roadWidth: 10,
    timeLimit: 85,
    accent: "#db9b50",
    obstacles: [
      { t: 0.16, offset: 2, radius: 1.15 },
      { t: 0.29, offset: -2, radius: 1.25 },
      { t: 0.44, offset: 2.2, radius: 1.1 },
      { t: 0.61, offset: -2.1, radius: 1.3 },
      { t: 0.79, offset: 1.7, radius: 1.2 },
    ],
    sand: [],
  },
  {
    id: 2,
    name: "Desafio do Farol",
    subtitle: "Precisão até a chegada",
    difficulty: "DESAFIADOR",
    description:
      "Curvas fechadas, passagem estreita e areia que reduz a aderência. Cada segundo conta.",
    roadWidth: 8.8,
    timeLimit: 65,
    accent: "#7faaa3",
    obstacles: [
      { t: 0.13, offset: 1.8, radius: 1.1 },
      { t: 0.23, offset: -1.9, radius: 1.2 },
      { t: 0.35, offset: 1.9, radius: 1.15 },
      { t: 0.55, offset: -1.8, radius: 1.15 },
      { t: 0.64, offset: 1.8, radius: 1.1 },
      { t: 0.76, offset: -1.8, radius: 1.2 },
      { t: 0.87, offset: 1.8, radius: 1.1 },
    ],
    sand: [
      [0.26, 0.32],
      [0.66, 0.72],
    ],
  },
];
export function getLevel(id: number) {
  return LEVELS[id] ?? LEVELS[0];
}
export function widthAt(t: number, id = 0) {
  return id === 2 && t > 0.4 && t < 0.49 ? 6.6 : getLevel(id).roadWidth;
}
export function onSand(t: number, id = 0) {
  return getLevel(id).sand.some(([a, b]) => t >= a && t <= b);
}
export function trackPosition(t: number, id = 0) {
  const a = (((t % 1) + 1) % 1) * Math.PI * 2;
  if (id === 1)
    return {
      x: Math.sin(a) * (79 + 13 * Math.sin(3 * a)),
      z: 108 * Math.cos(a) + 12 * Math.sin(2 * a),
    };
  if (id === 2)
    return {
      x: Math.sin(a) * (88 + 20 * Math.sin(3 * a)),
      z: 118 * Math.cos(a) + 16 * Math.sin(2 * a),
    };
  return {
    x: Math.sin(a) * (70 + 7 * Math.sin(2 * a)),
    z: 110 * Math.cos(a) + 6 * Math.sin(3 * a),
  };
}
