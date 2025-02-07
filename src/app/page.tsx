'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { processData } from '@/lib/processData'
import Header from '@/components/Header'
import Hero from '@/components/Hero'
import CompanyChart from '@/components/CompanyChart'
import YearRangeSlider from '@/components/YearRangeSlider'
import DensityMap from '@/components/DensityMap'
import ChartHeader from '@/components/ChartHeader'
import PartnersChart from '@/components/PartnersChart'
import Footer from '@/components/Footer'
import '@/styles/main.css'
import { debounce } from 'lodash'

export default function Home() {
  const [yearRange, setYearRange] = useState<[number, number]>([2005, 2025])
  const [dataType, setDataType] = useState<'industries' | 'tags'>('industries')
  const [isLoading, setIsLoading] = useState(true)
  const [isSliderVisible, setIsSliderVisible] = useState(false)

  // Process data immediately on component mount
  const processedData = useMemo(() => {
    setIsLoading(true)
    try {
      const data = processData(yearRange[0].toString(), yearRange[1].toString())
      return data
    } catch (error) {
      console.error('Error processing data:', error)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [yearRange])

  // Handle data type changes
  const handleDataTypeChange = useCallback((newDataType: 'industries' | 'tags') => {
    setDataType(newDataType)
  }, [])

  // Create scroll handler
  const handleScroll = useCallback(
    debounce(() => {
      const stackedChart = document.querySelector('.visualization-container')
      const mapContainer = document.querySelector('.map-container')
      
      if (stackedChart && mapContainer) {
        const stackedRect = stackedChart.getBoundingClientRect()
        const mapRect = mapContainer.getBoundingClientRect()
        
        // Show slider if either stacked chart or map is in view
        const stackedInView = stackedRect.top <= window.innerHeight && stackedRect.bottom >= 0
        const mapInView = mapRect.top <= window.innerHeight && mapRect.bottom >= 0
        
        setIsSliderVisible(stackedInView || mapInView)
      }
    }, 100),
    []
  )

  // Initialize scroll handler
  useEffect(() => {
    window.addEventListener('scroll', handleScroll)
    return () => {
      window.removeEventListener('scroll', handleScroll)
      handleScroll.cancel()
    }
  }, [handleScroll])

  // Check visibility when data is loaded
  useEffect(() => {
    if (!isLoading && processedData) {
      // Wait a bit for the DOM to update
      setTimeout(handleScroll, 100)
    }
  }, [isLoading, processedData, handleScroll])

  if (isLoading || !processedData) {
    return (
      <div className="loading-container">
        <div className="loading-text">Loading data...</div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <Header />
      <Hero />
      <YearRangeSlider
        value={yearRange}
        onChange={setYearRange}
        min={2005}
        max={2025}
        isVisible={isSliderVisible}
      />
      <main className="main-content">
        <div className="visualization-container">
          <ChartHeader
            data={processedData.byBatch}
            title="Distribution Over Time"
            dataType={dataType}
            onDataTypeChange={handleDataTypeChange}
          />
          <CompanyChart
            data={processedData.byBatch}
            title="Distribution Over Time"
            type="stacked-area"
            dataType={dataType}
          />
        </div>
        <div className="partners-visualization-container">
          <PartnersChart
            data={processedData.partnersStats}
          />
        </div>
        <div className='map-container'>
          <DensityMap 
            data={processedData.byBatch}
            dateRange={yearRange}
          />
        </div>
      </main>
      <Footer />
    </div>
  )
} 