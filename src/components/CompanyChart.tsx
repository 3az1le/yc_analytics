'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import * as d3 from 'd3'
import { ChartProps } from '@/types/chart'
import { 
  createScales
} from '@/lib/chartUtils'
import {
  initializeChart,
  drawStackedArea,
  updateChart
} from '@/lib/chartDrawing'
import '@/styles/main.css'

const orangeScale = [
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
}: Omit<ChartProps, 'dataType'>) {
  const [dataType, setDataType] = useState<'industries' | 'tags'>('industries')
  const svgRef = useRef<SVGSVGElement>(null)
  const scrollRef = useRef<number>(0)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [previousSelectedCategory, setPreviousSelectedCategory] = useState<string | null>(null)
  const [legendScrollOffset, setLegendScrollOffset] = useState(0)
  const [categories, setCategories] = useState<string[]>([])
  const colorScale = useMemo(() => d3.scaleOrdinal(orangeScale), [])
  const rafRef = useRef<number>()

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
    setPreviousSelectedCategory(selectedCategory)
    setSelectedCategory(prev => prev === category ? null : category)
  }, [selectedCategory])

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

    // Initialize chart if it doesn't exist
    if (svg.select('g.chart-container').empty()) {
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
    }

    // Update chart
    updateChart(svg, dimensions, {
      data,
      dataType,
      selectedCategory,
      previousSelectedCategory,
      colorScale,
      categories: newCategories
    })
  }, [data, selectedCategory, previousSelectedCategory, dataType, chartId, newCategories, colorScale])

  // Memoize legend items to prevent re-renders
  const legendItems = useMemo(() => (
    categories.map((category) => (
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
    ))
  ), [categories, selectedCategory, colorScale, handleCategoryClick])

  return (
    <div className="chart-wrapper">
      <div className="chart-header">
        <div className="chart-type-selector">
          <button
            onClick={() => {
              setDataType('industries')
              // Clear and reinitialize chart
              setSelectedCategory(null)

              const svg = d3.select(svgRef.current)
              svg.selectAll('*').remove()
              const containerBounds = svgRef.current.parentElement?.getBoundingClientRect()
              const dimensions = {
                width: containerBounds?.width ?? 600,
                height: containerBounds?.height ?? 400,
                margin: { top: 20, right: 200, bottom: 60, left: 60 }
              }
              const { categories: newCategories } = createScales(data, dimensions.width, dimensions.height, dimensions.margin, 'industries')
              setCategories(newCategories)
              colorScale.domain(newCategories)
              initializeChart(svg, chartId, dimensions, {
                data,
                dataType: 'industries',
                selectedCategory,
                previousSelectedCategory,
                colorScale,
                categories: newCategories
              })
            }}
            className={`chart-type-option ${dataType === 'industries' ? 'active' : ''}`}
          >
            Industries
          </button>
          <span className="chart-type-separator">/</span>
          <button
            onClick={() => {
              setDataType('tags')
              // Clear and reinitialize chart
              //set selected category to null
              setSelectedCategory(null)
              const svg = d3.select(svgRef.current)
              svg.selectAll('*').remove()
              const containerBounds = svgRef.current.parentElement?.getBoundingClientRect()
              const dimensions = {
                width: containerBounds?.width ?? 600,
                height: containerBounds?.height ?? 400,
                margin: { top: 20, right: 200, bottom: 60, left: 60 }
              }
              const { categories: newCategories } = createScales(data, dimensions.width, dimensions.height, dimensions.margin, 'tags')
              setCategories(newCategories)
              colorScale.domain(newCategories)
              initializeChart(svg, chartId, dimensions, {
                data,
                dataType: 'tags',
                selectedCategory,
                previousSelectedCategory,
                colorScale,
                categories: newCategories
              })
            }}
            className={`chart-type-option ${dataType === 'tags' ? 'active' : ''}`}
          >
            Tags
          </button>
        </div>
        <h2 className="chart-title">{title} </h2>
      </div>
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
            {legendItems}
          </div>
        </div>
      </div>
    </div>
  )
} 