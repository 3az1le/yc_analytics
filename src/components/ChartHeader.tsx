import { useCallback } from 'react'
import '@/styles/globals.css'
import { BatchData } from '@/lib/processData'

type ChartHeaderProps = {
  title: string
  data: BatchData[]
  dataType: 'industries' | 'tags'
  onDataTypeChange: (type: 'industries' | 'tags') => void
}

export default function ChartHeader({ data, title, onDataTypeChange, dataType }: ChartHeaderProps) {
    const handleDataTypeChange = useCallback((newDataType: 'industries' | 'tags') => {
        // If already on selected type, don't reinitialize
        if (dataType === newDataType) return;
        onDataTypeChange(newDataType)
    }, [dataType, onDataTypeChange])

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