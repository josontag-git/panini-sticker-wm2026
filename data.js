// Team-Liste gemaess WM-2026-Checkliste (48 Teams, alphabetisch, je 20 Sticker).
// Die genaue Zusammensetzung der 20 Sticker pro Team (Logo, Foto, Spielerpositionen)
// ist eine generische Platzhalter-Aufteilung, keine offizielle Panini-Checkliste.

const TEAMS = [
  { code: "EGY", name: "Ägypten" },
  { code: "ALG", name: "Algerien" },
  { code: "ARG", name: "Argentinien" },
  { code: "AUS", name: "Australien" },
  { code: "BEL", name: "Belgien" },
  { code: "BIH", name: "Bosnien-Herzegowina" },
  { code: "BRA", name: "Brasilien" },
  { code: "CUW", name: "Curaçao" },
  { code: "COD", name: "DR Kongo" },
  { code: "GER", name: "Deutschland" },
  { code: "ECU", name: "Ecuador" },
  { code: "CIV", name: "Elfenbeinküste" },
  { code: "ENG", name: "England" },
  { code: "FRA", name: "Frankreich" },
  { code: "GHA", name: "Ghana" },
  { code: "HAI", name: "Haiti" },
  { code: "IRQ", name: "Irak" },
  { code: "IRN", name: "Iran" },
  { code: "JPN", name: "Japan" },
  { code: "JOR", name: "Jordanien" },
  { code: "CAN", name: "Kanada" },
  { code: "CPV", name: "Kap Verde" },
  { code: "QAT", name: "Katar" },
  { code: "COL", name: "Kolumbien" },
  { code: "CRO", name: "Kroatien" },
  { code: "MAR", name: "Marokko" },
  { code: "MEX", name: "Mexiko" },
  { code: "NZL", name: "Neuseeland" },
  { code: "NED", name: "Niederlande" },
  { code: "NOR", name: "Norwegen" },
  { code: "AUT", name: "Österreich" },
  { code: "PAN", name: "Panama" },
  { code: "PAR", name: "Paraguay" },
  { code: "POR", name: "Portugal" },
  { code: "KSA", name: "Saudi-Arabien" },
  { code: "SCO", name: "Schottland" },
  { code: "SWE", name: "Schweden" },
  { code: "SUI", name: "Schweiz" },
  { code: "SEN", name: "Senegal" },
  { code: "ESP", name: "Spanien" },
  { code: "RSA", name: "Südafrika" },
  { code: "KOR", name: "Südkorea" },
  { code: "CZE", name: "Tschechien" },
  { code: "TUN", name: "Tunesien" },
  { code: "TUR", name: "Türkei" },
  { code: "USA", name: "USA" },
  { code: "URU", name: "Uruguay" },
  { code: "UZB", name: "Usbekistan" },
];

// 20 Sticker pro Team: Logo, Mannschaftsfoto, 18 Spieler (2 TW, 6 ABW, 6 MF, 4 ST)
const POSITIONS = ["TW", "TW", "ABW", "ABW", "ABW", "ABW", "ABW", "ABW", "MF", "MF", "MF", "MF", "MF", "MF", "ST", "ST", "ST", "ST"];

function teamColor(code) {
  let hash = 0;
  for (let i = 0; i < code.length; i++) hash = code.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 58%, 40%)`;
}

function generateStickers() {
  const stickers = [];
  for (const team of TEAMS) {
    const slots = [
      { type: "badge", label: "Team-Logo" },
      { type: "team", label: "Mannschaftsfoto" },
      ...POSITIONS.map((pos, i) => ({ type: "player", label: `Spieler ${i + 1}`, position: pos })),
    ];
    let n = 1;
    for (const slot of slots) {
      const number = String(n).padStart(2, "0");
      stickers.push({
        id: `${team.code}-${number}`,
        number,
        teamCode: team.code,
        teamName: team.name,
        color: teamColor(team.code),
        ...slot,
      });
      n++;
    }
  }
  return stickers;
}

const STICKERS = generateStickers();
