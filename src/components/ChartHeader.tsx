import { useRef, useState, useCallback, useMemo } from 'react'
import * as d3 from 'd3'
import { 
    createScales
  } from '@/lib/chartUtils'
  import {
    initializeChart
  } from '@/lib/chartDrawing'
  import '@/styles/main.css'
import { BatchData } from '@/lib/processData'

type ChartHeaderProps = {
  title: string
  data: BatchData[]
  dataType: 'industries' | 'tags'
  onDataTypeChange: (type: 'industries' | 'tags') => void
}
import { orangeScale } from '@/components/CompanyChart'


export default function ChartHeader({ data, title, onDataTypeChange }: ChartHeaderProps) {
    const [dataType, setDataType] = useState<'industries' | 'tags'>('industries')
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
    const [previousSelectedCategory, setPreviousSelectedCategory] = useState<string | null>(null)
    const [categories, setCategories] = useState<string[]>([])
    const colorScale = useMemo(() => d3.scaleOrdinal(orangeScale), [])
    const chartId = useMemo(() => title.toLowerCase().replace(/\s+/g, '-'), [title])
    const svgRef = useRef<SVGSVGElement>(null)

    const handleDataTypeChange = useCallback((newDataType: 'industries' | 'tags') => {
        // If already on selected type, don't reinitialize
        if (dataType === newDataType) return;
        
        setDataType(newDataType)
        onDataTypeChange(newDataType)
        // Reset category selection when changing data type
        setSelectedCategory(null)
        setPreviousSelectedCategory(null)

        const svgSelection = d3.select(svgRef.current)
        if (!svgRef.current || !svgSelection.node()) return;

        svgSelection.selectAll('*').remove()
        
        const containerBounds = svgRef.current?.parentElement?.getBoundingClientRect()
        const dimensions = {
            width: containerBounds?.width ?? 600,
            height: containerBounds?.height ?? 400,
            margin: { top: 20, right: 200, bottom: 60, left: 60 }
        }
        
        const { categories: newCategories } = createScales(data, dimensions, newDataType)
        console.log('createscale called from chartheader')
        setCategories(newCategories)
        colorScale.domain(newCategories)
        
        initializeChart(svgSelection as d3.Selection<SVGSVGElement, unknown, null, undefined>, chartId, dimensions, {
            data,
            dataType: newDataType,
            selectedCategory: null,
            previousSelectedCategory: null,
            colorScale,
            categories: newCategories
        })
    }, [dataType, data, chartId, colorScale, onDataTypeChange])

    return (
        <div className="visualization-header">
            <div className="chart-type-selector">
                <button
                    onClick={() => handleDataTypeChange('industries')}
                    className={`chart-type-option ${dataType === 'industries' ? 'active' : ''}`}
                >
                    Industries
                </button>
                <span className="chart-type-separator">/</span>
                <button
                    onClick={() => handleDataTypeChange('tags')}
                    className={`chart-type-option ${dataType === 'tags' ? 'active' : ''}`}
                >
                    Tags
                </button>
            </div>
            <h2 className="chart-title">{title}</h2>
        </div>
    )
} 