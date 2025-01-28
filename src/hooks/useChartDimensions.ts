import { useCallback, useEffect, useState } from 'react'
import { ChartDimensions } from '@/types/chart'

export function useChartDimensions(containerRef: React.RefObject<SVGSVGElement>) {
  const [dimensions, setDimensions] = useState<ChartDimensions>({
    width: 600,
    height: 400,
    margin: {
      top: 20,
      right: 200,
      bottom: 60,
      left: 60
    }
  })

  const updateDimensions = useCallback(() => {
    if (!containerRef.current?.parentElement) return

    const bounds = containerRef.current.parentElement.getBoundingClientRect()
    setDimensions(prev => ({
      ...prev,
      width: bounds.width,
      height: bounds.height
    }))
  }, [])

  useEffect(() => {
    updateDimensions()
    const resizeObserver = new ResizeObserver(updateDimensions)
    
    if (containerRef.current?.parentElement) {
      resizeObserver.observe(containerRef.current.parentElement)
    }

    return () => resizeObserver.disconnect()
  }, [updateDimensions])

  return dimensions
} 