import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import '@/styles/components/chart.css';

const orangeScale = [
  '#FC844B',
  '#DC510F',
  '#F5CFBD',
  '#EC9065',
  '#E99C77',
  '#F67537',
  '#DC510E',
  '#FF5B0E',
  '#FBAF8B',
  '#000000',
  '#4A4A4A',
  '#2D2D2D',
  '#1B365D',
  '#0A2744',
  '#0F3A66'
];

interface Company {
  company_name: string;
  team_size: number;
}

interface BatchData {
  [key: string]: Company[];
}

interface PartnerData {
  bybatch: BatchData;
}

interface PartnersData {
  [key: string]: PartnerData;
}

interface PartnersChartProps {
  data: PartnersData;
  dateRange: [number, number];
}

interface CompanyNode extends Company {
  cluster: number;
  partnerId: string;
  radius: number;
  x: number;
  y: number;
  cellX: number;
  cellY: number;
  cellWidth: number;
  cellHeight: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

const PartnersChart = ({ data, dateRange }: PartnersChartProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<any, undefined> | null>(null);
  const [toolkitVisible, setToolkitVisible] = useState(false);

  useEffect(() => {
    if (!svgRef.current || !data || !containerRef.current) return;

    // Clear previous chart
    d3.select(svgRef.current).selectAll('*').remove();

    // Setup dimensions with adjusted margins for better visibility
    const width = 1200;
    const height = 600;
    const margin = { top: 40, right: 40, bottom: 40, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    // Create main group
    const mainGroup = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Process and filter data based on date range
    const partners = Object.entries(data).map(([name, partnerData]) => {
      const companies = Object.entries(partnerData.bybatch)
        .filter(([batchName]) => {
          const year = 2000 + parseInt(batchName.slice(-2));
          return year >= dateRange[0] && year <= dateRange[1];
        })
        .flatMap(([_, companies]) => companies);
      return { name, companies };
    }).filter(partner => partner.companies.length > 0); // Remove partners with no companies in range

    // Create color scale
    const colorScale = d3.scaleOrdinal()
      .domain(partners.map((_, i) => i.toString()))
      .range(orangeScale);

    // Calculate optimal grid layout
    const cols = Math.ceil(Math.sqrt(partners.length));
    const rows = Math.ceil(partners.length / cols);
    const cellWidth = innerWidth / cols;
    const cellHeight = innerHeight / rows;
    const minDimension = Math.min(cellWidth, cellHeight);
    const spacing = minDimension * 0.4;

    // Create company nodes with better initial positions
    const companyNodes: CompanyNode[] = partners.flatMap((partner, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const centerPosX = col * cellWidth + cellWidth / 2 - margin.left;
      const centerPosY = row * cellHeight + cellHeight / 2 + margin.top;

      return partner.companies.map((company, j) => {
        const angle = (j / partner.companies.length) * 2 * Math.PI;
        const spiralRadius = Math.min(spacing * 0.4, 
          (Math.sqrt(j + 1) / Math.sqrt(partner.companies.length)) * spacing * 0.8);
        
        return {
          ...company,
          cluster: i,
          partnerId: partner.name,
          radius: Math.sqrt(company.team_size) * 0.5,
          x: centerPosX + Math.cos(angle) * spiralRadius,
          y: centerPosY + Math.sin(angle) * spiralRadius,
          cellX: col * cellWidth - margin.left,
          cellY: row * cellHeight + margin.top,
          cellWidth,
          cellHeight,
          vx: 0,
          vy: 0
        };
      });
    });

    // Create company circles
    const companies = mainGroup.selectAll<SVGCircleElement, CompanyNode>('.company-node')
      .data(companyNodes)
      .join('circle')
      .attr('class', 'company-node')
      .attr('r', d => d.radius)
      .style('fill', d => colorScale(d.cluster.toString()) as string)
      .style('opacity', 0.7)
      .style('cursor', 'grab')
      .attr('cx', d => d.x)
      .attr('cy', d => d.y);

    // Add drag behavior
    const drag = d3.drag<SVGCircleElement, any>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
        d3.select(event.sourceEvent.target).style('cursor', 'grabbing');
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
        d3.select(event.sourceEvent.target).style('cursor', 'grab');
      });

    companies.call(drag as any);

    // Create tooltip
    const tooltip = d3.select('body').append('div')
      .attr('class', 'chart-tooltip')
      .style('position', 'absolute')
      .style('visibility', 'hidden');

    // Add hover interactions
    companies
      .on('mouseover', (event, d) => {
        tooltip
          .style('visibility', 'visible')
          .html(`${d.company_name}<br>Team size: ${d.team_size}<br>Partner: ${d.partnerId}`)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px');
      })
      .on('mousemove', (event) => {
        tooltip
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px');
      })
      .on('mouseout', () => {
        tooltip.style('visibility', 'hidden');
      });

    // Setup simulation with adjusted forces
    const simulation = d3.forceSimulation(companyNodes)
      .stop(); // Stop initial simulation

    // Function to run simulation for a single partner's grid cell
    const runGridSimulation = async (partnerIndex: number) => {
      const partnerNodes = companyNodes.filter(node => node.cluster === partnerIndex);
      if (partnerNodes.length === 0) return;

      // Reset positions to initial spiral layout
      const col = partnerIndex % cols;
      const row = Math.floor(partnerIndex / cols);
      const centerPosX = col * cellWidth + cellWidth / 2 - margin.left;
      const centerPosY = row * cellHeight + cellHeight / 2 + margin.top;

      partnerNodes.forEach((node, j) => {
        const angle = (j / partnerNodes.length) * 2 * Math.PI;
        const spiralRadius = Math.min(spacing * 0.4,
          (Math.sqrt(j + 1) / Math.sqrt(partnerNodes.length)) * spacing * 0.8);
        node.x = centerPosX + Math.cos(angle) * spiralRadius;
        node.y = centerPosY + Math.sin(angle) * spiralRadius;
      });

      // Adjust simulation parameters for the 6th partner (index 5)
      const isSpecialPartner = partnerIndex === 5;
      
      // Create local simulation for this grid
      const localSimulation = d3.forceSimulation(partnerNodes)
        .alphaDecay(isSpecialPartner ? 0.2 : 0.2) // Much slower decay for 6th partner
        .velocityDecay(isSpecialPartner ? 0.6 : 0.6) // Less velocity decay for more movement
        .alpha(isSpecialPartner ? 0.5 : 0.5) // Higher initial alpha for longer simulation
        .force('cluster', (alpha) => {
          const k = alpha * (isSpecialPartner ? 0.4 : 0.4); // Gentler force for longer movement
          for (let node of partnerNodes) {
            const targetX = node.cellX + cellWidth / 2;
            const targetY = node.cellY + cellHeight / 2;
            node.vx = (node.vx || 0) + (targetX - node.x) * k;
            node.vy = (node.vy || 0) + (targetY - node.y) * k;
          }
        })
        .force('collide', d3.forceCollide((d: CompanyNode) => d.radius + 1).iterations(10))
        .force('bound', () => {
          for (let node of partnerNodes) {
            const padding = node.radius;
            node.x = Math.max(node.cellX + padding,
                      Math.min(node.cellX + cellWidth - padding, node.x));
            node.y = Math.max(node.cellY + padding,
                      Math.min(node.cellY + cellHeight - padding, node.y));
          }
        });

      // Update positions during simulation
      localSimulation.on('tick', () => {
        companies
          .filter(d => d.cluster === partnerIndex)
          .attr('cx', d => d.x)
          .attr('cy', d => d.y);
      });

      // Wait for simulation to complete or force end after 5 seconds
      await Promise.race([
        new Promise<void>(resolve => {
          localSimulation.on('end', () => {
            localSimulation.stop();
            resolve();
          });
        }),
        new Promise<void>(resolve => setTimeout(() => {
          localSimulation.stop();
          resolve();
        }, 5000))
      ]);
    };

    // Run simulations sequentially
    const runAllSimulations = async () => {
      for (let i = 0; i < partners.length; i += 2) {
        // Run two simulations in parallel
        const promises = [
          runGridSimulation(i),
          // Only run second simulation if there is a partner left
          i + 1 < partners.length ? runGridSimulation(i + 1) : Promise.resolve()
        ];
        await Promise.all(promises);
      }
    };

    // Store simulation reference (for cleanup)
    simulationRef.current = simulation;

    // Run simulations once when component mounts
    runAllSimulations();

    // Cleanup
    return () => {
      simulation.stop();
      tooltip.remove();
    };
  }, [data, dateRange]);

  // Create legend component
  const Legend = () => {
    // Filter partners to only show those with companies in the selected date range
    const activePartners = Object.entries(data)
      .filter(([_, partnerData]) => {
        const hasCompaniesInRange = Object.entries(partnerData.bybatch)
          .some(([batchName]) => {
            const year = 2000 + parseInt(batchName.slice(-2));
            return year >= dateRange[0] && year <= dateRange[1];
          });
        return hasCompaniesInRange;
      })
      .map(([name]) => name);

    const colorScale = d3.scaleOrdinal()
      .domain(activePartners.map((_, i) => i.toString()))
      .range(orangeScale);

    return (
      <div className="partners-legend">
        {activePartners.map((partner, i) => (
          <div key={partner} className="legend-item">
            <div 
              className="legend-color" 
              style={{ 
                backgroundColor: colorScale(i.toString()) as string,
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                display: 'inline-block',
                marginRight: '8px'
              }} 
            />
            <span>{partner}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="partners-chart-container" 
         ref={containerRef}
         onMouseEnter={() => { if(window.matchMedia('(hover: hover)').matches) setToolkitVisible(true); }}
         onMouseLeave={() => { if(window.matchMedia('(hover: hover)').matches) setToolkitVisible(false); }}
         onClick={() => { if(!window.matchMedia('(hover: hover)').matches) setToolkitVisible(prev => !prev); }}>
      <div className="visualization-header">
        <h2 className="chart-title">Partners and Companies</h2>
      </div>
      {toolkitVisible && (
        <div className="toolkit" style={{ position: 'absolute', top: '10px', right: '10px', background: '#fff', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', zIndex: 1000 }}>
          <button>Action 2</button>
        </div>
      )}
      <div className="partners-chart-wrapper">
        <svg ref={svgRef}></svg>
      </div>
      <Legend />
    </div>
  );
};

export default PartnersChart; 