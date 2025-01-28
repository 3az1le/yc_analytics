import { BatchData } from '@/lib/processData'

export type ChartDataType = 'industries' | 'tags'

export interface ChartProps {
  data: BatchData[]
  title: string
  type: 'stacked-area'
  dataType?: ChartDataType
}

export interface ChartDimensions {
  width: number
  height: number
  margin: {
    top: number
    right: number
    bottom: number
    left: number
  }
} 