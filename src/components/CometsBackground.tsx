// خلفية مذنّبات خفيفة جدًا (CSS فقط) — طبقة تجميلية غير تفاعلية خلف المحتوى.
const comets = [
  { top: '12%', delay: '0s', dur: '9s' },
  { top: '40%', delay: '3s', dur: '11s' },
  { top: '68%', delay: '6s', dur: '8s' },
]

export function CometsBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <style>{`
        @keyframes comet-fly {
          0% { transform: translate(0, 0); opacity: 0; }
          10% { opacity: 0.7; }
          100% { transform: translate(-120vw, 30vh); opacity: 0; }
        }
      `}</style>
      {comets.map((c, i) => (
        <span
          key={i}
          style={{
            top: c.top,
            right: '-10vw',
            animation: `comet-fly ${c.dur} linear ${c.delay} infinite`,
          }}
          className="absolute h-0.5 w-24 rounded-full bg-gradient-to-l from-indigo-300/70 to-transparent"
        />
      ))}
    </div>
  )
}
