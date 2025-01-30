'use client'

import { useEffect, useRef, useMemo } from 'react'
import * as d3 from 'd3'
import { BatchData } from '@/lib/processData'
import { processLocations } from '@/lib/mapUtils'
import '@/styles/layouts/map.css'
import { debounce } from 'lodash'

type DensityMapProps = {
  data: BatchData[]
  dateRange: [number, number]
}

export default function DensityMap({ data, dateRange }: DensityMapProps) {
  const mapRef = useRef<SVGSVGElement>(null)

  // Memoize and debounce the update function
  const debouncedUpdate = useMemo(
    () => debounce((data: BatchData[], dateRange: [number, number]) => {
      if (!mapRef.current || !data?.length) return

      const svg = d3.select(mapRef.current)
      const width = 1200
      const height = 600

      svg.selectAll('*').remove()

      const projection = d3.geoMercator()
        .scale(180)
        .center([0, 20])
        .translate([width / 2, height / 2])

      const path = d3.geoPath().projection(projection)

      // Aggregate location data
      const locationCounts = new Map<string, number>()
      data.forEach(batch => {
        // Parse year correctly based on batch format (S05, W06, etc.)
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
        .range(['#ffeae1', '#DC510F'])
        .clamp(true)

      console.log('Location counts:', Object.fromEntries(locationCounts))

      // Load and process map
      d3.json('/filtered_countries.geojson').then((worldData: any) => {
        console.log('First few features:', worldData.features.slice(0, 3))

        // Draw countries
        svg.selectAll('path')
          .data(worldData.features)
          .enter()
          .append('path')
          .attr('d', path)
          .attr('fill', d => {
            const count = locationCounts.get(d.properties.ISO_A3) || 0
            return count > 0 ? colorScale(count) : '#ffffff'
          })
          .on('mouseover', (event, d) => {
            const count = locationCounts.get(d.properties.ISO_A3) || 0
            if (count > 0) {
              d3.select(event.currentTarget)
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
          .on('mouseout', (event) => {
            d3.select(event.currentTarget)
              .attr('stroke-width', 0.5)
            
            d3.select('.map-tooltip').style('visibility', 'hidden')
          })
      })
    }, 500),
    []
  )

  useEffect(() => {
    debouncedUpdate(data, dateRange)
    return () => {
      debouncedUpdate.cancel()
    }
  }, [data, dateRange, debouncedUpdate])

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