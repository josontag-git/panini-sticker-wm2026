// Platzhalter-Struktur fuer das WM-2026-Album: 12 Gruppen (A-L) mit je 4 Teams,
// pro Team 14 Sticker (Logo, Mannschaftsfoto, 12 Spielerpositionen).
// Dies ist KEINE offizielle Panini-Checkliste, sondern eine generische Vorlage.

const GROUPS = [
  { id: "A", teams: [
    { code: "MEX", name: "Mexiko" },
    { code: "USA", name: "USA" },
    { code: "CAN", name: "Kanada" },
    { code: "PAN", name: "Panama" },
  ]},
  { id: "B", teams: [
    { code: "ARG", name: "Argentinien" },
    { code: "BRA", name: "Brasilien" },
    { code: "URU", name: "Uruguay" },
    { code: "ECU", name: "Ecuador" },
  ]},
  { id: "C", teams: [
    { code: "FRA", name: "Frankreich" },
    { code: "ENG", name: "England" },
    { code: "ESP", name: "Spanien" },
    { code: "GER", name: "Deutschland" },
  ]},
  { id: "D", teams: [
    { code: "POR", name: "Portugal" },
    { code: "NED", name: "Niederlande" },
    { code: "BEL", name: "Belgien" },
    { code: "ITA", name: "Italien" },
  ]},
  { id: "E", teams: [
    { code: "CRO", name: "Kroatien" },
    { code: "COL", name: "Kolumbien" },
    { code: "MAR", name: "Marokko" },
    { code: "SEN", name: "Senegal" },
  ]},
  { id: "F", teams: [
    { code: "JPN", name: "Japan" },
    { code: "KOR", name: "Suedkorea" },
    { code: "AUS", name: "Australien" },
    { code: "IRN", name: "Iran" },
  ]},
  { id: "G", teams: [
    { code: "KSA", name: "Saudi-Arabien" },
    { code: "QAT", name: "Katar" },
    { code: "CHI", name: "Chile" },
    { code: "PER", name: "Peru" },
  ]},
  { id: "H", teams: [
    { code: "SUI", name: "Schweiz" },
    { code: "DEN", name: "Daenemark" },
    { code: "SWE", name: "Schweden" },
    { code: "POL", name: "Polen" },
  ]},
  { id: "I", teams: [
    { code: "SRB", name: "Serbien" },
    { code: "AUT", name: "Oesterreich" },
    { code: "UKR", name: "Ukraine" },
    { code: "TUN", name: "Tunesien" },
  ]},
  { id: "J", teams: [
    { code: "ALG", name: "Algerien" },
    { code: "NGA", name: "Nigeria" },
    { code: "GHA", name: "Ghana" },
    { code: "CMR", name: "Kamerun" },
  ]},
  { id: "K", teams: [
    { code: "EGY", name: "Aegypten" },
    { code: "CRC", name: "Costa Rica" },
    { code: "JAM", name: "Jamaika" },
    { code: "NZL", name: "Neuseeland" },
  ]},
  { id: "L", teams: [
    { code: "NOR", name: "Norwegen" },
    { code: "TUR", name: "Tuerkei" },
    { code: "WAL", name: "Wales" },
    { code: "SCO", name: "Schottland" },
  ]},
];

const POSITIONS = ["TW", "ABW", "ABW", "ABW", "ABW", "MF", "MF", "MF", "MF", "ST", "ST", "ST"];

function teamColor(code) {
  let hash = 0;
  for (let i = 0; i < code.length; i++) hash = code.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 58%, 40%)`;
}

function generateStickers() {
  const stickers = [];
  let n = 1;
  for (const group of GROUPS) {
    for (const team of group.teams) {
      const slots = [
        { type: "badge", label: "Team-Logo" },
        { type: "team", label: "Mannschaftsfoto" },
        ...POSITIONS.map((pos, i) => ({ type: "player", label: `Spieler ${i + 1}`, position: pos })),
      ];
      for (const slot of slots) {
        const number = String(n).padStart(3, "0");
        stickers.push({
          id: `${team.code}-${number}`,
          number,
          groupId: group.id,
          teamCode: team.code,
          teamName: team.name,
          color: teamColor(team.code),
          ...slot,
        });
        n++;
      }
    }
  }
  return stickers;
}

const STICKERS = generateStickers();
