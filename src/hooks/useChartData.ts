import { useMemo } from 'react'
import { BatchData } from '@/lib/processData'

export function useChartData(data: BatchData[], dataType: 'industries' | 'tags') {
  return useMemo(() => {
    if (!data?.length) return null
    
    const categories = Array.from(
      new Set(data.flatMap(d => Object.keys(d[dataType] || {})))
    ).sort()
    
    return { data, categories }
  }, [data, dataType])
} 