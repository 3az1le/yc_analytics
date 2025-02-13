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
  const [localValue, setLocalValue] = useState<[number, number]>(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (newValue: number[]) => {
    const [start, end] = newValue;
    if (end - start < 1) {
      // If dragging the start thumb
      if (start > localValue[0]) {
        setLocalValue([start, Math.min(start + 1, max)]);
      } else if (end < localValue[1]) {
        // If dragging the end thumb
        setLocalValue([Math.max(end - 1, min), end]);
      }
      return;
    }
    
    const typedValue: [number, number] = [newValue[0], newValue[1]];
    setLocalValue(typedValue);
  }

  const handleCommit = (newValue: number[]) => {
    const [start, end] = newValue;
    if (end - start < 1) {
      // If dragging the start thumb
      if (start > localValue[0]) {
        const updatedValue: [number, number] = [start, Math.min(start + 1, max)];
        setLocalValue(updatedValue);
        onChange(updatedValue);
      } else if (end < localValue[1]) {
        // If dragging the end thumb
        const updatedValue: [number, number] = [Math.max(end - 1, min), end];
        setLocalValue(updatedValue);
        onChange(updatedValue);
      }
      return;
    }
    
    const typedValue: [number, number] = [newValue[0], newValue[1]];
    setLocalValue(typedValue);
    onChange(typedValue);
  }

  const yearLabels = ['05', '10','15', '20', '25']

  // Ensure initial value has minimum range
  useEffect(() => {
    if (value[1] - value[0] < 1) {
      const updatedValue: [number, number] = [value[0], Math.min(value[0] + 1, max)];
      onChange(updatedValue);
    }
  }, [value, onChange, max]);

  // Verify that local value and prop value are in sync
  useEffect(() => {
    const isOutOfSync = value[0] !== localValue[0] || value[1] !== localValue[1];
    const hasValidRange = value[1] - value[0] >= 1;
    
    if (isOutOfSync && hasValidRange) {
      setLocalValue(value);
    }
  }, [value, localValue]);

  return (
    <div className={`slider-container ${isVisible ? 'visible' : ''}`}>
      <h3 className="slider-title">Incorporation Date Range</h3>
      <Slider.Root
        className="slider-root"
        value={localValue}
        onValueChange={handleChange}
        onValueCommit={handleCommit}
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