export function CrateIcon({ size = 24 }: { size?: number }) {
  const cells = [
    [2,  2,  1.0], [10, 2,  0.7], [18, 2,  0.4],
    [2,  10, 0.7], [10, 10, 0.4], [18, 10, 0.2],
    [2,  18, 0.4], [10, 18, 0.2], [18, 18, 0.08],
  ]
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {cells.map(([x, y, opacity], i) => (
        <rect key={i} x={x} y={y} width="6" height="6" rx="1"
          fill="#e8a020" opacity={opacity} />
      ))}
    </svg>
  )
}
