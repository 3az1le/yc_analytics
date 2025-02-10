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
import '@/styles/globals.css'
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
      const hero = document.querySelector('.hero-section')
      const footer = document.querySelector('footer')
      const mainContent = document.querySelector('.main-content')
      
      if (hero && footer && mainContent) {
        const heroRect = hero.getBoundingClientRect()
        const footerRect = footer.getBoundingClientRect()
        const mainContentRect = mainContent.getBoundingClientRect()
        const windowHeight = window.innerHeight
        const documentHeight = document.documentElement.scrollHeight
        const scrollPosition = window.scrollY + windowHeight
        
        // Calculate how much of the hero is visible
        const heroVisibleHeight = Math.min(heroRect.bottom, windowHeight) - Math.max(heroRect.top, 0)
        const heroVisiblePercentage = heroVisibleHeight / heroRect.height

        // Check if footer is fully visible in the viewport
        const isFooterFullyVisible = footerRect.top <= windowHeight && footerRect.bottom <= windowHeight
        
        // Check if we're near the bottom of the page (within 100px)
        const isNearBottom = documentHeight - scrollPosition < 100

        // Hide slider if:
        // 1. Hero is more than 50% visible, or
        // 2. Footer is fully visible, or
        // 3. We're near the bottom of the page
        setIsSliderVisible(!(
          heroVisiblePercentage > 0.5 || 
          isFooterFullyVisible || 
          isNearBottom
        ))
      }
    }, 100),
    []
  )

  // Initialize scroll handler
  useEffect(() => {
    window.addEventListener('scroll', handleScroll)
    handleScroll()
    return () => {
      window.removeEventListener('scroll', handleScroll)
      handleScroll.cancel()
    }
  }, [handleScroll])

  // Check visibility when data is loaded
  useEffect(() => {
    if (!isLoading && processedData) {
      setTimeout(handleScroll, 50)
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
            dateRange={yearRange}
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