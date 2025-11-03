// 이 컴포넌트는 DateTimeSection으로 통합되었습니다.
// 하위 호환성을 위해 wrapper로 유지합니다.
import DateTimeSection from './DateTimeSection'

interface PickupDateTimeSectionProps {
  deliveryDate: string
  deliveryTime: string
  minOrderDays: number
  quantityRanges?: {
    minQuantity: number
    maxQuantity: number
    daysBeforeOrder: number
  }[]
  totalQuantity?: number
  onDateChange: (date: string) => void
  onTimeChange: (time: string) => void
  onShowDateInfoModal: () => void
}

export default function PickupDateTimeSection(props: PickupDateTimeSectionProps) {
  return <DateTimeSection type="pickup" {...props} />
}
