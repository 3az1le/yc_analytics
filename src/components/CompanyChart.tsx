'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import * as d3 from 'd3'
import { ChartProps } from '@/types/chart'
import { 
  createScales, 
  calculateYDomain,
  addAxes 
} from '@/lib/chartUtils'
import {
  drawStackedArea,
  initializeChart,
  updateChart
} from '@/lib/chartDrawing'
import '@/styles/main.css'

const orangeScale = [
  '#F5CFBD',
  '#EC9065',
  '#E99C77',
  '#FC844B',
  '#F67537',
  '#FBAF8B',
  '#FFE2D4',
  '#FF5B0E',
  '#DC510F'
]

export default function CompanyChart({ 
  data, 
  title, 
  type, 
  dataType = 'industries' 
}: ChartProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const scrollRef = useRef<number>(0)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [previousSelectedCategory, setPreviousSelectedCategory] = useState<string | null>(null)
  const [legendScrollOffset, setLegendScrollOffset] = useState(0)
  const [categories, setCategories] = useState<string[]>([])
  const colorScale = useMemo(() => d3.scaleOrdinal(orangeScale), [])
  const rafRef = useRef<number>()

  const chartId = useMemo(() => title.toLowerCase().replace(/\s+/g, '-'), [title])

  const legendItemHeight = 40
  const maxVisibleItems = Math.floor((500 - 80) / legendItemHeight)
  const maxScroll = Math.max(0, (categories.length - maxVisibleItems) * legendItemHeight)

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const delta = e.deltaY * 2
    const legendHeight = 500 // Visible container height
    const totalContentHeight = categories.length * legendItemHeight
    const maxScroll = Math.max(0, totalContentHeight - legendHeight)
    
    const newOffset = Math.max(0, Math.min(scrollRef.current + delta, maxScroll))
    
    scrollRef.current = newOffset
    requestAnimationFrame(() => {
      const legendScroll = document.querySelector(`.legend-wrapper-${chartId} .legend-scroll`) as HTMLElement
      if (legendScroll) {
        legendScroll.style.transform = `translateY(-${newOffset}px)`
      }
    })
  }, [chartId, categories.length])

  useEffect(() => {
    const element = document.querySelector(`.legend-wrapper-${title.toLowerCase().replace(/\s+/g, '-')}`) as HTMLElement
    if (element) {
      element.addEventListener('wheel', handleWheel as EventListener, { passive: false })
      return () => {
        element.removeEventListener('wheel', handleWheel as EventListener)
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current)
        }
      }
    }
  }, [handleWheel, title])

  const processedData = useMemo(() => {
    if (!data?.length) return null
    const newCategories = Array.from(
      new Set(data.flatMap(d => Object.keys(d[dataType] || {})))
    ).sort()
    return { data, categories: newCategories }
  }, [data, dataType])

  // Handle category selection
  const handleCategoryClick = useCallback((category: string) => {
    setPreviousSelectedCategory(selectedCategory)
    setSelectedCategory(prev => prev === category ? null : category)
  }, [selectedCategory])

  // Initialize chart
  useEffect(() => {
    if (!svgRef.current || !data?.length) return

    const svg = d3.select(svgRef.current)
    const containerBounds = svgRef.current.parentElement?.getBoundingClientRect()
    const dimensions = {
      width: containerBounds?.width ?? 600,
      height: containerBounds?.height ?? 400,
      margin: { top: 20, right: 200, bottom: 60, left: 60 }
    }

    const { categories: newCategories } = createScales(data, dimensions.width, dimensions.height, dimensions.margin, dataType)
    setCategories(newCategories)
    colorScale.domain(newCategories)

    initializeChart(svg, chartId, dimensions, {
      data,
      dataType,
      selectedCategory,
      previousSelectedCategory,
      colorScale,
      categories: newCategories
    })
  }, [])

  // Update chart on data or category changes
  useEffect(() => {
    if (!svgRef.current || !data?.length) return

    const svg = d3.select(svgRef.current)
    const containerBounds = svgRef.current.parentElement?.getBoundingClientRect()
    const dimensions = {
      width: containerBounds?.width ?? 600,
      height: containerBounds?.height ?? 400,
      margin: { top: 20, right: 200, bottom: 60, left: 60 }
    }

    updateChart(svg, dimensions, {
      data,
      dataType,
      selectedCategory,
      previousSelectedCategory,
      colorScale,
      categories
    }, false)
  }, [data, selectedCategory, previousSelectedCategory])

  return (
    <div className="chart-wrapper">
      <h2 className="chart-title">{title}</h2>
      <div className="chart-container">
        <svg
          ref={svgRef}
          className="chart-svg"
        />
        <div 
          className={`legend-wrapper legend-wrapper-${title.toLowerCase().replace(/\s+/g, '-')}`}
        >
          <div 
            className="legend-scroll"
            style={{ 
              transform: `translateY(-${legendScrollOffset}px)`,
              willChange: 'transform'
            }}
          >
            {categories.map((category) => (
              <div
                key={category}
                className="legend-item"
                style={{
                  opacity: selectedCategory && selectedCategory !== category ? 0.5 : 1,
                }}
                onClick={() => handleCategoryClick(category)}
              >
                <div
                  className="legend-color"
                  style={{
                    backgroundColor: colorScale(category)
                  }}
                />
                <span>{category}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
} 