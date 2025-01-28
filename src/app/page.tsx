'use client'

import { useState, useEffect, useMemo } from 'react'
import { processData } from '@/lib/processData'
import Header from '@/components/Header'
import Hero from '@/components/Hero'
import CompanyChart from '@/components/CompanyChart'
import YearRangeSlider from '@/components/YearRangeSlider'
import '@/styles/main.css'
import { debounce } from 'lodash'

export default function Home() {
  const [yearRange, setYearRange] = useState<[number, number]>([2005, 2025])
  const [isLoading, setIsLoading] = useState(true)
  const [isSliderVisible, setIsSliderVisible] = useState(false)

  const stats = useMemo(() => {
    try {
      return processData(yearRange[0].toString(), yearRange[1].toString())
    } catch (error) {
      console.error('Error processing data:', error)
      return null
    } finally {
      setIsLoading(false)
    }
  }, [yearRange])

  useEffect(() => {
    const handleScroll = debounce(() => {
      const firstChart = document.querySelector('.chart-wrapper')
      if (firstChart) {
        const rect = firstChart.getBoundingClientRect()
        setIsSliderVisible(rect.top <= window.innerHeight && rect.bottom >= 0)
      }
    }, 100)

    window.addEventListener('scroll', handleScroll)
    handleScroll()
    return () => {
      window.removeEventListener('scroll', handleScroll)
      handleScroll.cancel()
    }
  }, [])

  if (isLoading || !stats) {
    return <div className="loading-container">
      <div className="loading-text">Loading data...</div>
    </div>
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
        <div className="charts-container">
          <CompanyChart
            data={stats.byBatch}
            title="Industry Distribution Over Time"
            type="stacked-area"
            dataType="industries"
          />
          <CompanyChart
            data={stats.byBatch}
            title="Tags Distribution Over Time"
            type="stacked-area"
            dataType="tags"
          />
        </div>
      </main>
    </div>
  )
} 