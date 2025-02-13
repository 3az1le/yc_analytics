'use client'

import React, { useEffect, useState } from 'react'
import * as Slider from '@radix-ui/react-slider'
import '@/styles/globals.css'

interface YearRangeSliderProps {
  value: [number, number]
  onChange: (value: [number, number]) => void
  min: number
  max: number
  isVisible: boolean
}

const YearRangeSlider: React.FC<YearRangeSliderProps> = ({
  value,
  onChange,
  min,
  max,
  isVisible
}) => {

  const handleChange = (newValue: number[]) => {
    const [start, end] = newValue
    if (end - start < 1) {
      // If dragging the start thumb
      if (start > value[0]) {
        onChange([start, Math.min(start + 1, max)])
      } else if (end < value[1]) {
        // If dragging the end thumb
        onChange([Math.max(end - 1, min), end])
      }
      return
    }
    
    const typedValue: [number, number] = [newValue[0], newValue[1]]
    onChange(typedValue)
  }

  const handleCommit = (newValue: number[]) => {
    // Only call onChange when the user releases the slider
    const [start, end] = newValue
    if (end - start < 1) {
      // If dragging the start thumb
      if (start > value[0]) {
        onChange([start, Math.min(start + 1, max)])
      } else if (end < value[1]) {
        // If dragging the end thumb
        onChange([Math.max(end - 1, min), end])
      }
      return
    }
    onChange([newValue[0], newValue[1]])
  }

  const yearLabels = ['05', '10','15', '20', '25']

  // Ensure initial value has minimum range
  useEffect(() => {
    if (value[1] - value[0] < 1) {
      onChange([value[0], Math.min(value[0] + 1, max)])
    }
  }, [value, onChange, max])

  return (
    <div className={`slider-container ${isVisible ? 'visible' : ''}`}>
      <h3 className="slider-title">Incorporation Date Range</h3>
      <Slider.Root
        className="slider-root"
        value={value}
        onValueChange={handleChange}
        min={min}
        max={max}
        step={1}
        minStepsBetweenThumbs={1}
      >
        <Slider.Track className="slider-track">
          <Slider.Range className="slider-range" />
        </Slider.Track>
        <Slider.Thumb
          className="slider-thumb"
          aria-label="Start year"
        />
        <Slider.Thumb
          className="slider-thumb"
          aria-label="End year"
        />
      </Slider.Root>
      <div className="year-labels">
        {yearLabels.map(year => (
          <span key={year} className="year-label">{year}</span>
        ))}
      </div>
    </div>
  )
}

export default YearRangeSlider