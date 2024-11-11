'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useTheme } from 'next-themes'
import { Moon, Sun, ZoomIn, ZoomOut, Maximize2, ChevronDown } from 'lucide-react'
import { motion } from 'framer-motion'
import { useHotkeys } from 'react-hotkeys-hook'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Toggle } from '@/components/ui/toggle'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const quickAccessResources = [
  'Pod', 'Deployment', 'Service', 'ConfigMap', 'Secret', 'Ingress', 
  'Namespace', 'PersistentVolumeClaim', 'HorizontalPodAutoscaler', 'CronJob'
]

const apiGroups = {
  'Core (v1)': [
    'Pod', 'Service', 'ReplicationController', 'Namespace', 'Node', 'PersistentVolume',
    'PersistentVolumeClaim', 'ConfigMap', 'Secret', 'ServiceAccount', 'LimitRange',
    'ResourceQuota', 'Endpoints'
  ],
  'Apps (apps/v1)': ['Deployment', 'StatefulSet', 'DaemonSet', 'ReplicaSet'],
  'Batch (batch/v1)': ['Job', 'CronJob'],
  'Autoscaling (autoscaling/v1)': ['HorizontalPodAutoscaler'],
  'Networking (networking.k8s.io/v1)': ['Ingress', 'NetworkPolicy'],
  'Policy (policy/v1)': ['PodDisruptionBudget'],
  'Storage (storage.k8s.io/v1)': ['StorageClass', 'VolumeAttachment', 'CSIDriver', 'CSINode'],
  'RBAC (rbac.authorization.k8s.io/v1)': ['Role', 'RoleBinding', 'ClusterRole', 'ClusterRoleBinding'],
  'Scheduling (scheduling.k8s.io/v1)': ['PriorityClass'],
  'API Extensions (apiextensions.k8s.io/v1)': ['CustomResourceDefinition'],
  'Admission (admissionregistration.k8s.io/v1)': ['MutatingWebhookConfiguration', 'ValidatingWebhookConfiguration'],
  'Certificates (certificates.k8s.io/v1)': ['CertificateSigningRequest'],
  'Coordination (coordination.k8s.io/v1)': ['Lease'],
  'Events (events.k8s.io/v1)': ['Event'],
}

const namespaces = ['default', 'kube-system', 'kube-public', 'kube-node-lease']

const getRandomNamespace = () => namespaces[Math.floor(Math.random() * namespaces.length)]

const fetchClusterData = async () => {
  const mockData = {}
  Object.entries(apiGroups).forEach(([group, resources]) => {
    mockData[group] = resources.map(resource => ({
      id: `${resource.toLowerCase()}-${Math.random().toString(36).substr(2, 9)}`,
      type: resource,
      name: `${resource.toLowerCase()}-example`,
      apiGroup: group,
      namespace: getRandomNamespace(),
    }))
  })
  return mockData
}

const queryClient = new QueryClient()

function DashboardContent() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedResource, setSelectedResource] = useState(null)
  const [zoomLevel, setZoomLevel] = useState(1)
  const { theme, setTheme } = useTheme()
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [selectedResources, setSelectedResources] = useState({})
  const [mounted, setMounted] = useState(false)

  const { data: clusterData, isLoading, error } = useQuery({
    queryKey: ['clusterData'],
    queryFn: fetchClusterData,
    refetchInterval: 5000,
  })

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

  const handleResourceClick = (resource) => {
    setSelectedResource(prev => prev && prev.id === resource.id ? null : resource)
  }

  const filteredResources = clusterData
    ? Object.values(clusterData).flat().filter(resource =>
        resource.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        selectedResources[resource.type]
      )
    : []

  const namespaceColors = useMemo(() => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8']
    return namespaces.reduce((acc, namespace, index) => {
      acc[namespace] = colors[index % colors.length]
      return acc
    }, {})
  }, [])

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div className={`flex h-screen ${mounted && theme === 'dark' ? 'dark' : ''}`}>
      <div className="w-64 p-4 border-r overflow-auto bg-background text-foreground">
        <Input
          type="search"
          placeholder="Search resources..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="mb-4"
        />
        <Accordion type="multiple" className="w-full">
          <AccordionItem value="quick-access">
            <AccordionTrigger>Quick Access</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2">
                {quickAccessResources.map(resource => (
                  <Toggle
                    key={resource}
                    pressed={selectedResources[resource] || false}
                    onPressedChange={() => toggleResourceSelection(resource)}
                  >
                    {resource}
                  </Toggle>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="all-objects">
            <AccordionTrigger>All Objects</AccordionTrigger>
            <AccordionContent>
              {Object.entries(apiGroups).map(([group, resources]) => (
                <Accordion type="multiple" className="w-full" key={group}>
                  <AccordionItem value={group}>
                    <AccordionTrigger>{group}</AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2">
                        {resources.map(resource => (
                          <Toggle
                            key={resource}
                            pressed={selectedResources[resource] || false}
                            onPressedChange={() => toggleResourceSelection(resource)}
                          >
                            {resource}
                          </Toggle>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              ))}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
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
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                >
                  <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  <span className="sr-only">Toggle theme</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Toggle dark mode</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="border rounded-lg p-4 h-[calc(100vh-12rem)] overflow-hidden">
          <motion.div
            style={{
              scale: zoomLevel,
              transition: 'scale 0.2s',
            }}
            className="w-full h-full bg-accent/20 rounded-md relative"
          >
            {filteredResources.map((resource) => (
              <motion.div
                key={resource.id}
                className="absolute p-2 rounded-md shadow-md cursor-pointer"
                style={{
                  left: `${Math.random() * 80}%`,
                  top: `${Math.random() * 80}%`,
                  backgroundColor: namespaceColors[resource.namespace],
                }}
                whileHover={{ scale: 1.05 }}
                onClick={() => handleResourceClick(resource)}
              >
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>{resource.name}</TooltipTrigger>
                    <TooltipContent>
                      <p>{resource.type}</p>
                      <p>{resource.apiGroup}</p>
                      <p>Namespace: {resource.namespace}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
      {selectedResource && (
        <Card className="w-80 p-4 m-4 bg-card text-card-foreground">
          <CardHeader>
            <CardTitle>{selectedResource.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Type: {selectedResource.type}</p>
            <p>API Group: {selectedResource.apiGroup}</p>
            <p>Namespace: {selectedResource.namespace}</p>
            <p>ID: {selectedResource.id}</p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="mt-4">
                  Actions <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuLabel>Resource Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>View YAML</DropdownMenuItem>
                <DropdownMenuItem>Edit</DropdownMenuItem>
                <DropdownMenuItem>Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export function DashboardComponent() {
  return (
    <QueryClientProvider client={queryClient}>
      <DashboardContent />
    </QueryClientProvider>
  )
}