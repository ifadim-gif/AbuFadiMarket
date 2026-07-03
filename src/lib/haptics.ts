// ذبذبات لمسية خفيفة، مع فحص دعم المتصفح (navigator.vibrate غير مدعوم في iOS Safari).
type HapticPattern = 'tap' | 'success' | 'warning'

const patterns: Record<HapticPattern, number | number[]> = {
  tap: 10,
  success: [15, 40, 15],
  warning: [40, 30, 40],
}

export function haptic(pattern: HapticPattern = 'tap') {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(patterns[pattern])
  }
}
