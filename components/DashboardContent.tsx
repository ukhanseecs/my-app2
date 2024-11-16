import { useState, useCallback, useEffect, useMemo } from 'react'
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { useHotkeys } from 'react-hotkeys-hook'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ResourceList } from './ResourceList'
import { ResourceDetails } from './ResourceDetails'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'

function DashboardContent() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [selectedResources, setSelectedResources] = useState<{ [key: string]: boolean }>({})
  const [mounted, setMounted] = useState(false)
  const [apiResources, setApiResources] = useState({})
  const [quickAccessResources, setQuickAccessResources] = useState([])
  const [showYaml, setShowYaml] = useState(false)

  const { data: resourceTypes, isLoading: isLoadingResources, error: resourceTypesError } = useQuery({
    queryKey: ['resourceTypes'],
    queryFn: async () => {
      const response = await fetch('http://localhost:8080/')
      if (!response.ok) {
        throw new Error('Failed to fetch resource types')
      }
      return response.json()
    },
  })

  useEffect(() => {
    if (resourceTypes) {
      const commonResources = [
        'Pods', 'Deployments', 'Services', 'Configmaps', 'Secrets', 'Ingresses',
        'Namespaces', 'Persistentvolumeclaims', 'Horizontalpodautoscalers', 'Cronjobs'
      ]

      setQuickAccessResources(
        resourceTypes.filter((type: string) => commonResources.includes(type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()))
      )

      const groupedResources = {
        'Core (v1)': resourceTypes.filter((type: string) =>
          ['Pods', 'Services', 'Namespaces', 'Configmaps', 'Secrets'].includes(type.charAt(0).toUpperCase() + type.slice(1).toLowerCase())
        ),
        'Apps': resourceTypes.filter((type: string) =>
          ['Deployments', 'Statefulsets', 'Daemonsets'].includes(type.charAt(0).toUpperCase() + type.slice(1).toLowerCase())
        ),
        'Other': resourceTypes.filter((type: string) =>
          !commonResources.includes(type.charAt(0).toUpperCase() + type.slice(1).toLowerCase())
        )
      }
      setApiResources(groupedResources)
    }
  }, [resourceTypes])

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleZoom = useCallback((delta: number) => {
    setZoomLevel((prevZoom) => Math.max(0.5, Math.min(2, prevZoom + delta)))
  }, [])

  useHotkeys('ctrl+=', () => handleZoom(0.1), [handleZoom])
  useHotkeys('ctrl+-', () => handleZoom(-0.1), [handleZoom])
  useHotkeys('ctrl+0', () => setZoomLevel(1), [])

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullScreen(true)
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
        setIsFullScreen(false)
      }
    }
  }

  const toggleResourceSelection = (resourceType: string) => {
    setSelectedResources(prev => ({
      ...prev,
      [resourceType]: !prev[resourceType]
    }))
  }

  interface Resource {
    id: string
    type: string
    name: string
    namespace: string
    details?: any
  }

  const handleResourceClick = async (resource: Resource) => {
    if (selectedResource?.type === resource.type && selectedResource?.name === resource.name) {
      setSelectedResource(null)
      return
    }

    try {
      const response = await fetch(`http://localhost:8080/details/${resource.type.toLowerCase()}/${resource.name}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch details for ${resource.type}/${resource.name}`)
      }
      const details = await response.json()
      setSelectedResource({
        ...resource,
        details,
        namespace: resource.namespace
      })
    } catch (error) {
      console.error('Error fetching resource details:', error)
    }
  }

  const { data: resources, isLoading: isLoadingResourceList, error: resourcesError } = useQuery({
    queryKey: ['resources', selectedResources],
    queryFn: async () => {
      const selectedTypes = Object.entries(selectedResources)
        .filter(([_, isSelected]) => isSelected)
        .map(([type]) => type)

      if (selectedTypes.length === 0) return []

      const results = []
      for (const type of selectedTypes) {
        try {
          const response = await fetch(`http://localhost:8080/list/${type.toLowerCase()}`)
          if (!response.ok) {
            throw new Error(`Failed to fetch ${type}`)
          }
          const names = await response.json()

          const resources = names.map((name: string) => ({
            id: `${type}-${name}`,
            type: type,
            name: name,
            namespace: 'default'
          }))
          results.push({ type, resources })
        } catch (error) {
          console.error(`Error fetching ${type}:`, error)
        }
      }
      return results
    },
    enabled: Object.values(selectedResources).some(v => v)
  })

  const filteredResources = useMemo(() => {
    if (!resources) return []

    return resources
      .flatMap(({ type, resources }) => resources)
      .filter(resource =>
        resource.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
  }, [resources, searchTerm])

  const resourceTypeColors = useMemo(() => ({
    Pods: '#ADD8E6',
    Deployments: '#90EE90',
    Services: '#87CEFA',
    Configmaps: '#98FB98',
    Secrets: '#FFD700',
    Ingresses: '#FFA07A',
    Namespaces: '#9370DB',
    Persistentvolumeclaims: '#FFDAB9',
    Horizontalpodautoscalers: '#AFEEEE',
    Cronjobs: '#E6E6FA',
    Statefulsets: '#FFB6C1',
    Daemonsets: '#F0E68C',
    Jobs: '#D8BFD8',
    Configurations: '#B0E0E6',
    Servicesaccounts: '#FF6347',
    Nodes: '#4682B4',
    Persistentvolumes: '#FFFACD',
    Storageclasses: '#FFDEAD',
    Endpoints: '#A52A2A',
    default: '#A9A9A9'
  }), [])

  const calculatePosition = (index: number, total: number) => {
    const columns = 3
    const row = Math.floor(index / columns)
    const col = index % columns

    const itemWidth = 25
    const itemHeight = 15
    const horizontalSpacing = 10
    const verticalSpacing = 10

    return {
      left: `${col * (itemWidth + horizontalSpacing)}%`,
      top: `${row * (itemHeight + verticalSpacing)}%`,
      width: `${itemWidth}%`,
      position: 'absolute' as const,
    }
  }

  if (isLoadingResources || isLoadingResourceList) return <div>Loading resources...</div>
  if (resourceTypesError) return <div>Error: {resourceTypesError.message}</div>
  if (resourcesError) return <div>Error: {resourcesError.message}</div>

  return (
    <TooltipProvider>
      <div className="flex h-screen">
        <div className="w-64 p-4 border-r overflow-auto bg-background text-foreground" style={{ flexShrink: 0 }}>
          <Input
            type="search"
            placeholder="Search resources..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mb-4"
          />
          <ResourceList
            quickAccessResources={quickAccessResources}
            apiResources={apiResources}
            selectedResources={selectedResources}
            toggleResourceSelection={toggleResourceSelection}
          />
        </div>
        <div className="flex-1 p-4 overflow-hidden bg-background text-foreground">
          <div className="flex justify-between mb-4">
            <div>
              <Button onClick={() => handleZoom(0.1)} className="mr-2">
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button onClick={() => handleZoom(-0.1)} className="mr-2">
                <ZoomOut className="w-4 h-4" />
              </Button>
              <Button onClick={() => setZoomLevel(1)} className="mr-2">
                <Maximize2 className="w-4 h-4" />
              </Button>
              <Button onClick={toggleFullScreen}>
                {isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
              </Button>
            </div>
          </div>
          <div className="border rounded-lg p-4 h-[calc(100vh-12rem)] overflow-auto max-w-full">
            <motion.div
              style={{
                scale: zoomLevel,
                transition: 'scale 0.2s',
                maxWidth: '100%',
              }}
              className="w-full h-full bg-accent/20 rounded-md relative overflow-auto"
            >
              {filteredResources.length === 0 ? (
                <div>No resources found</div>
              ) : (
                <div className="grid grid-cols-3 gap-6 overflow-y-scroll max-h-[70vh]">
                  {filteredResources.map((resource, index) => (
                    <Tooltip key={`${resource.type}-${resource.name}`}>
                      <TooltipTrigger asChild>
                        <motion.div
                          layout
                          initial={false}
                          className="p-2 rounded-md shadow-md cursor-pointer flex flex-col items-start"
                          style={{
                            backgroundColor: resourceTypeColors[resource.type.charAt(0).toUpperCase() + resource.type.slice(1).toLowerCase() as keyof typeof resourceTypeColors] || resourceTypeColors.default,
                            boxShadow: selectedResource?.type === resource.type && selectedResource?.name === resource.name ? '0px 0px 10px #000' : 'none',
                          }}
                          whileHover={{ scale: 1.05 }}
                          onClick={() => handleResourceClick(resource)}
                        >
                          <div className="whitespace-nowrap overflow-hidden text-ellipsis" style={{ maxWidth: '100%' }}>
                            {resource.name}
                          </div>
                          <div className="text-xs mt-2 px-2 py-1 bg-gray-200 rounded-md">Type: {resource.type}</div>
                          <div className="text-xs mt-1 px-2 py-1 bg-gray-200 rounded-md">Namespace: {resource.namespace}</div>
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div>
                          <div><strong>Type:</strong> {resource.type}</div>
                          <div><strong>Namespace:</strong> {resource.namespace}</div>
                          <div><strong>Name:</strong> {resource.name}</div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </div>
        {selectedResource && (
          <ResourceDetails
            selectedResource={selectedResource}
            showYaml={showYaml}
            setShowYaml={setShowYaml}
          />
        )}
      </div>
    </TooltipProvider>
  )
}

export { DashboardContent }