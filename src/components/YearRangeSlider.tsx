'use client'

import React from 'react'
import * as Slider from '@radix-ui/react-slider'
import '@/styles/main.css'

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
    const typedValue: [number, number] = [newValue[0], newValue[1]]
    onChange(typedValue)
  }

  const yearLabels = ['05', '10','15', '20', '25']

  return (
    <div className={`slider-container ${isVisible ? 'visible' : ''}`}>
      <Slider.Root
        className="slider-root"
        value={value}
        onValueChange={handleChange}
        min={min}
        max={max}
        step={1}
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