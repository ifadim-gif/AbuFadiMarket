import { useEffect } from 'react'
import Swal from 'sweetalert2'
import { subscribeToSupernova } from './queries'
import { haptic } from '../../lib/haptics'

export function useSupernovaListener() {
  useEffect(() => {
    const unsubscribe = subscribeToSupernova(({ total }) => {
      haptic('success')
      Swal.fire({
        icon: 'success',
        title: '💥 سوبرنوفا!',
        html: `رقم قياسي جديد لأكبر عملية سداد: <b>${total.toFixed(2)}</b>`,
        confirmButtonText: 'رائع',
        backdrop: true,
      })
    })
    return unsubscribe
  }, [])
}
