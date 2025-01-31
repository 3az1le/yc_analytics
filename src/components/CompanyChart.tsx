'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import * as d3 from 'd3'
import { ChartProps } from '@/types/chart'
import {
  initializeChart,
  drawStackedArea,
  updateChart
} from '@/lib/chartDrawing'
import '@/styles/main.css'

export const orangeScale = [
  '#DC510F',
  '#F5CFBD',
  '#EC9065',
  '#E99C77',
  '#FC844B',
  '#F67537',
  '#DC510E',
  '#FF5B0E',
  '#FBAF8B'
]

export default function CompanyChart({ 
  data, 
  title, 
  type,
  dataType,
}: ChartProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const scrollRef = useRef<number>(0)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [previousSelectedCategory, setPreviousSelectedCategory] = useState<string | null>(null)
  const [legendScrollOffset, setLegendScrollOffset] = useState(0)
  const [categories, setCategories] = useState<string[]>([])
  const colorScale = useMemo(() => d3.scaleOrdinal(orangeScale), [])
  const rafRef = useRef<number>()
  const prevDataTypeRef = useRef(dataType)

  const chartId = useMemo(() => title.toLowerCase().replace(/\s+/g, '-'), [title])

  const legendItemHeight = 31
  const maxVisibleItems = Math.floor((500 - 80) / legendItemHeight)
  const maxScroll = Math.max(0, (categories.length - maxVisibleItems) * legendItemHeight)

  // Memoize categories to prevent unnecessary re-renders
  const { categories: newCategories } = useMemo(() => {
    if (!data?.length) return { categories: [] }
    
    // Get initial categories from data
    const cats = Array.from(
      new Set(data.flatMap(d => {
        const currentData = dataType === 'industries' 
          ? d.percentage_industries_among_total_industries 
          : d.percentage_tags_among_total_tags;
        return Object.keys(currentData || {});
      }))
    ).sort();

    // Always include "Other" category
    return {
      categories: [...cats, 'Other']
    }
  }, [data, dataType])

  // Update categories only when necessary
  useEffect(() => {
    setCategories(newCategories)
    colorScale.domain(newCategories)
  }, [newCategories, colorScale])

  // Handle data type changes immediately
  if (prevDataTypeRef.current !== dataType) {
    prevDataTypeRef.current = dataType
    if (selectedCategory !== null) {
      setSelectedCategory(null)
      setPreviousSelectedCategory(null)
      return null // Return null to prevent rendering until state is updated
    }
  }

  // Optimize legend scroll handler
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
    }

    rafRef.current = requestAnimationFrame(() => {
      const delta = e.deltaY * 2
      const legendHeight = 500
      const totalContentHeight = categories.length * legendItemHeight
      const maxScroll = Math.max(0, totalContentHeight - legendHeight)
      
      const newOffset = Math.max(0, Math.min(scrollRef.current + delta, maxScroll))
      scrollRef.current = newOffset
      setLegendScrollOffset(newOffset)
    })
  }, [categories.length, legendItemHeight])

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

  // Handle category selection
  const handleCategoryClick = useCallback((category: string) => {
    // Prevent clicking on "Other" category
    if (category === 'Other') return;
    
    setPreviousSelectedCategory(selectedCategory)
    setSelectedCategory(prev => prev === category ? null : category)
  }, [selectedCategory])

  // Update chart on data or category changes
  useEffect(() => {
    if (!svgRef.current || !data?.length) return

    const svg = d3.select(svgRef.current)
    const containerBounds = svgRef.current.parentElement?.getBoundingClientRect()
    
    if (!containerBounds) {
      console.error('Container bounds not available')
      return
    }

    // Define dimensions object explicitly with default values
    const dimensions = {
      width: containerBounds?.width ?? 500,
      height: containerBounds?.height ?? 400,
      margin: { 
        top: 20, 
        right: 0,
        bottom: 60, 
        left: 60 
      }
    } as const

    // Initialize chart if it doesn't exist
    if (svg.select('g.chart-container').empty()) {
      setCategories(newCategories)
      colorScale.domain(newCategories)

      try {
        initializeChart(svg, chartId, dimensions, {
          data,
          dataType,
          selectedCategory,
          previousSelectedCategory,
          colorScale,
          categories: newCategories
        })
      } catch (error) {
        console.error('Error initializing chart:', error)
      }
    }

    // Update chart
    try {
      updateChart(svg, dimensions, {
        data,
        dataType,
        selectedCategory,
        previousSelectedCategory,
        colorScale,
        categories: newCategories
      })
    } catch (error) {
      console.error('Error updating chart:', error)
    }
  }, [data, selectedCategory, previousSelectedCategory, dataType, chartId, newCategories, colorScale])

  // Memorize legend items to prevent re-renders
  const legendItems = useMemo(() => (
    categories.map((category) => (
      <div
        key={category}
        className="legend-item"
        style={{
          opacity: selectedCategory && selectedCategory !== category ? 0.5 : 1,
          cursor: category === 'Other' ? 'default' : 'pointer'
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
    ))
  ), [categories, selectedCategory, colorScale, handleCategoryClick])

  return (
    <div className="chart-wrapper">
      <div className="chart-main-container">
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
            {legendItems}
          </div>
        </div>
      </div>
    </div>
  )
} 