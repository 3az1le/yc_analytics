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
  '#FC844B',
  '#DC510F',
  '#F5CFBD',
  '#EC9065',
  '#E99C77',
  '#F67537',
  '#DC510E',
  '#FF5B0E',
  '#FBAF8B'
]

// Create a static color scale that will be reused
export const staticColorScale = d3.scaleOrdinal(orangeScale)

export default function CompanyChart({ 
  data, 
  title, 
  type,
  dataType,
}: ChartProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const scrollRef = useRef<number>(0)
  const legendWrapperRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [previousSelectedCategory, setPreviousSelectedCategory] = useState<string | null>(null)
  const [legendScrollOffset, setLegendScrollOffset] = useState(0)
  const [categories, setCategories] = useState<string[]>([])
  const rafRef = useRef<number>()
  const prevDataTypeRef = useRef(dataType)

  const chartId = useMemo(() => title.toLowerCase().replace(/\s+/g, '-'), [title])

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
    staticColorScale.domain([...cats, 'Other'])
    return {
      categories: [...cats, 'Other']
    }
  }, [data, dataType])

  // Update categories only when necessary
  useEffect(() => {
    setCategories(newCategories)
  }, [newCategories])

  // Handle data type changes immediately
  if (prevDataTypeRef.current !== dataType) {
    prevDataTypeRef.current = dataType
    if (selectedCategory !== null) {
      setSelectedCategory(null)
      setPreviousSelectedCategory(null)
      return null // Return null to prevent rendering until state is updated
    }
  }

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
        top: 10, 
        right: 10,
        bottom: 60, 
        left: 60 
      }
    } as const

    // Initialize chart if it doesn't exist
    if (svg.select('g.chart-container').empty()) {
      try {
        initializeChart(svg, chartId, dimensions, {
          data,
          dataType,
          selectedCategory,
          previousSelectedCategory,
          colorScale: staticColorScale,
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
        colorScale: staticColorScale,
        categories: newCategories
      })
    } catch (error) {
      console.error('Error updating chart:', error)
    }
  }, [data, selectedCategory, previousSelectedCategory, dataType, chartId, newCategories, staticColorScale])

  // Memorize legend items to prevent re-renders
  const legendItems = useMemo(() => (
    categories.map((category) => (
      <div
        key={category}
        className="stack-area-legend-item"
        style={{
          opacity: selectedCategory && selectedCategory !== category ? 0.5 : 1,
          cursor: category === 'Other' ? 'default' : 'pointer'
        }}
        onClick={() => handleCategoryClick(category)}
      >
        <div
          className="legend-color"
          style={{
            backgroundColor: staticColorScale(category)
          }}
        />
        <span>{category}</span>
      </div>
    ))
  ), [categories, selectedCategory, staticColorScale, handleCategoryClick])

  // Check scroll position
  const checkScroll = useCallback(() => {
    const element = legendWrapperRef.current?.querySelector('.legend-scroll') as HTMLElement
    if (element) {
      const canScrollLeft = element.scrollLeft > 0
      const canScrollRight = element.scrollLeft < (element.scrollWidth - element.clientWidth - 1)
      
      setCanScrollLeft(canScrollLeft)
      setCanScrollRight(canScrollRight)
    }
  }, [])

  // Add scroll event listener
  useEffect(() => {
    const element = legendWrapperRef.current?.querySelector('.legend-scroll') as HTMLElement
    if (element) {
      element.addEventListener('scroll', checkScroll)
      // Initial check
      checkScroll()
      
      // Check on resize
      const resizeObserver = new ResizeObserver(checkScroll)
      resizeObserver.observe(element)

      return () => {
        element.removeEventListener('scroll', checkScroll)
        resizeObserver.disconnect()
      }
    }
  }, [checkScroll])

  // Add event listener for area clicks
  useEffect(() => {
    const chartContainer = document.querySelector(`.chart-container-${chartId}`)
    if (!chartContainer) return

    const handleCategorySelect = (event: Event) => {
      const customEvent = event as CustomEvent
      const category = customEvent.detail.category
      setPreviousSelectedCategory(selectedCategory)
      setSelectedCategory(prev => prev === category ? null : category)
    }

    chartContainer.addEventListener('categorySelect', handleCategorySelect)
    return () => {
      chartContainer.removeEventListener('categorySelect', handleCategorySelect)
    }
  }, [chartId, selectedCategory])

  return (
    <div className="chart-wrapper">
      <div className="chart-main-container">
        <div className={`chart-container chart-container-${chartId}`}>
          <svg
            ref={svgRef}
            className="chart-svg"
          />
        </div>
        <div 
          ref={legendWrapperRef}
          className={`legend-wrapper ${canScrollLeft ? 'can-scroll-left' : ''} ${canScrollRight ? 'can-scroll-right' : ''}`}
        >
          <div className="legend-scroll">
            <div>
              {legendItems}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 