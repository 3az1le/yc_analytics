'use client'

import { useEffect, useRef, useMemo, useState } from 'react'
import * as d3 from 'd3'
import { BatchData } from '@/lib/processData'
import { processLocations } from '@/lib/mapUtils'
import '@/styles/layouts/map.css'

type DensityMapProps = {
  data: BatchData[]
  dateRange: [number, number]
}

export default function DensityMap({ data, dateRange }: DensityMapProps) {
  const mapRef = useRef<SVGSVGElement>(null)
  const [worldData, setWorldData] = useState<any>(null)

  // Load GeoJSON data only once when component mounts
  useEffect(() => {
    d3.json('/filtered_countries.geojson').then((data: any) => {
      setWorldData(data)
    })
  }, [])

  // Memoize the update function
  const updateMap = useMemo(() => {
    return (data: BatchData[], dateRange: [number, number], worldData: any) => {
      if (!mapRef.current || !data?.length || !worldData) return

      const svg = d3.select(mapRef.current)
      const width = 1200
      const height = 600

      const projection = d3.geoMercator()
        .scale(180)
        .center([0, 20])
        .translate([width / 2, height / 2])

      const path = d3.geoPath().projection(projection)

      // Aggregate location data
      const locationCounts = new Map<string, number>()
      data.forEach(batch => {
        const year = 2000 + parseInt(batch.name.slice(-2))
        if (year >= dateRange[0] && year <= dateRange[1]) {
          Object.entries(batch.locations).forEach(([country, count]) => {
            const current = locationCounts.get(country) || 0
            locationCounts.set(country, current + count)
          })
        }
      })

      // Create logarithmic color scale
      const maxCount = Math.max(...Array.from(locationCounts.values()))
      const colorScale = d3.scaleLog()
        .domain([1, maxCount])
        .range(['#ffeae1', '#DC510F'] as any)
        .clamp(true)

      // Initial setup of paths if they don't exist
      if (svg.select('path').empty()) {
        svg.selectAll('path')
          .data(worldData.features)
          .join('path')
          .attr('d', path as any)
          .attr('fill', '#ffffff')
      }

      // Update paths with transition
      svg.selectAll('path')
        .data(worldData.features)
        .transition()
        .duration(750)
        .attr('fill', (d: any) => {
          const count = locationCounts.get(d.properties.ISO_A3) || 0
          return count > 0 ? colorScale(count) : '#ffffff'
        })

      // Add event listeners
      svg.selectAll('path')
        .on('mouseover', (event, d: any) => {
          const count = locationCounts.get(d.properties.ISO_A3) || 0
          if (count > 0) {
            d3.select(event.currentTarget)
              .transition()
              .duration(150)
              .attr('stroke', '#000')
              .attr('stroke-width', 1)
            
            d3.select('body')
              .selectAll('.map-tooltip')
              .data([null])
              .join('div')
              .attr('class', 'map-tooltip')
              .style('visibility', 'visible')
              .style('left', `${event.pageX + 10}px`)
              .style('top', `${event.pageY - 10}px`)
              .html(`${d.properties.ADMIN}: ${count} companies`)
          }
        })
        .on('mousemove', (event, d: any) => {
          const count = locationCounts.get(d.properties.ISO_A3) || 0
          if (count > 0) {
            d3.select('.map-tooltip')
              .style('left', `${event.pageX + 10}px`)
              .style('top', `${event.pageY - 10}px`)
          }
        })
        .on('mouseout', (event) => {
          d3.select(event.currentTarget)
            .transition()
            .duration(150)
            .attr('stroke', null)
            .attr('stroke-width', null)
          
          d3.select('.map-tooltip').style('visibility', 'hidden')
        })
    }
  }, [])

  // Update map when data, date range, or world data changes
  useEffect(() => {
    if (worldData) {
      updateMap(data, dateRange, worldData)
    }
  }, [data, dateRange, worldData, updateMap])

  return (
    <div className="map-container">
      <div className="map-header">
        <h2 className="chart-title">Geographic Distribution</h2>
      </div>
      <svg
        ref={mapRef}
        width="1200"
        height="600"
        viewBox="0 0 1200 600"
        preserveAspectRatio="xMidYMid meet"
      />
    </div>
  )
} 