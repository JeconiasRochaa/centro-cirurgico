/** Ilustração decorativa (vetorial, original) de uma sala de cirurgia: foco cirúrgico, mesa, monitor com ECG, suporte de soro e equipe. */
export function OperatingRoomIllustration({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 520 340" role="img" aria-label="Ilustração de uma sala de cirurgia com mesa cirúrgica, foco de luz e monitor cardíaco" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="orGlow" cx="50%" cy="0%" r="80%"><stop offset="0%" stopColor="#00C9B7" stopOpacity=".55" /><stop offset="100%" stopColor="#00C9B7" stopOpacity="0" /></radialGradient>
        <linearGradient id="orWall" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ffffff" stopOpacity=".10" /><stop offset="100%" stopColor="#ffffff" stopOpacity=".02" /></linearGradient>
        <linearGradient id="orFloor" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ffffff" stopOpacity=".14" /><stop offset="100%" stopColor="#ffffff" stopOpacity=".04" /></linearGradient>
      </defs>
      {/* parede e piso */}
      <rect x="10" y="10" width="500" height="250" rx="18" fill="url(#orWall)" />
      <path d="M10 262 H510 V322 a18 18 0 0 1 -18 18 H28 a18 18 0 0 1 -18 -18 Z" fill="url(#orFloor)" />
      <ellipse cx="260" cy="300" rx="190" ry="20" fill="#000" opacity=".18" />
      {/* azulejos */}
      <g stroke="#fff" strokeOpacity=".06">{[90, 170, 250].map((y) => <line key={y} x1="10" x2="510" y1={y} y2={y} />)}{[110, 210, 310, 410].map((x) => <line key={x} y1="10" y2="260" x1={x} x2={x} />)}</g>
      {/* foco cirúrgico */}
      <path d="M260 10 V44 L218 66" stroke="#9fc3dc" strokeWidth="6" strokeLinecap="round" fill="none" />
      <path d="M260 44 L306 62" stroke="#9fc3dc" strokeWidth="6" strokeLinecap="round" fill="none" />
      <ellipse cx="206" cy="72" rx="40" ry="10" fill="#e6f0f7" /><ellipse cx="206" cy="68" rx="30" ry="6" fill="#fff" />
      <ellipse cx="318" cy="68" rx="40" ry="10" fill="#e6f0f7" /><ellipse cx="318" cy="64" rx="30" ry="6" fill="#fff" />
      <path d="M170 76 L120 238 H292 L242 76 Z" fill="url(#orGlow)" opacity=".7" />
      <path d="M290 72 L262 238 H430 L346 72 Z" fill="url(#orGlow)" opacity=".5" />
      {/* mesa cirúrgica */}
      <rect x="150" y="196" width="230" height="16" rx="8" fill="#cfe0ec" />
      <rect x="160" y="190" width="210" height="10" rx="5" fill="#eaf3f9" />
      <rect x="252" y="212" width="26" height="62" rx="4" fill="#8fb4cc" /><rect x="214" y="270" width="102" height="12" rx="6" fill="#7aa3bd" />
      {/* paciente coberto */}
      <path d="M176 190 C190 160 222 156 252 160 C296 164 330 164 356 190 Z" fill="#00C9B7" opacity=".92" />
      <circle cx="170" cy="176" r="15" fill="#f1d3b8" /><path d="M156 174 a15 13 0 0 1 28 -6 v6 Z" fill="#00A89A" />
      {/* monitor */}
      <rect x="402" y="104" width="80" height="58" rx="7" fill="#0a2b44" stroke="#9fc3dc" strokeWidth="3" />
      <path className="ecg-line" d="M410 136 H426 L432 122 L440 150 L447 128 L452 136 H474" fill="none" stroke="#00E6D0" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="436" y="162" width="12" height="46" fill="#9fc3dc" /><rect x="418" y="206" width="48" height="8" rx="4" fill="#9fc3dc" />
      <circle cx="466" cy="112" r="2.5" fill="#00E6D0" />
      {/* suporte de soro */}
      <path d="M72 94 V262" stroke="#b9d3e4" strokeWidth="5" strokeLinecap="round" /><path d="M54 94 H90" stroke="#b9d3e4" strokeWidth="5" strokeLinecap="round" />
      <rect x="58" y="100" width="22" height="34" rx="8" fill="#e8f6ff" opacity=".9" /><rect x="62" y="116" width="14" height="14" rx="5" fill="#00C9B7" opacity=".7" />
      <path d="M69 134 C69 160 110 170 150 196" stroke="#e8f6ff" strokeOpacity=".7" strokeWidth="1.6" fill="none" />
      <path d="M52 262 H92" stroke="#b9d3e4" strokeWidth="5" strokeLinecap="round" />
      {/* equipe: cirurgião e auxiliar */}
      <g>
        <circle cx="236" cy="132" r="14" fill="#f1d3b8" /><path d="M221 128 a15 13 0 0 1 30 0 v4 h-30 Z" fill="#0f6e8a" /><rect x="226" y="136" width="20" height="8" rx="3" fill="#e8f6ff" />
        <path d="M212 190 C210 160 220 148 236 148 C252 148 262 160 260 190 Z" fill="#12a8b8" />
        <path d="M222 192 L218 262 H236 L238 220 L240 262 H256 L252 192 Z" fill="#0f7f93" />
      </g>
      <g>
        <circle cx="322" cy="136" r="13" fill="#e2bd9b" /><path d="M308 132 a14 12 0 0 1 28 0 v4 h-28 Z" fill="#0f6e8a" /><rect x="313" y="140" width="18" height="7" rx="3" fill="#e8f6ff" />
        <path d="M300 192 C298 164 308 152 322 152 C336 152 346 164 344 192 Z" fill="#12a8b8" />
        <path d="M309 194 L306 262 H322 L324 222 L326 262 H340 L336 194 Z" fill="#0f7f93" />
      </g>
      {/* bandeja de instrumentos */}
      <rect x="352" y="214" width="46" height="5" rx="2.5" fill="#cfe0ec" /><path d="M360 214 V262 M390 214 V262" stroke="#9fc3dc" strokeWidth="3" /><path d="M362 210 l12 -6 M376 211 l10 -8" stroke="#fff" strokeOpacity=".8" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
