
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface ResourceDetailsProps {
  selectedResource: {
    name: string;
    type: string;
    namespace: string;
    details?: {
      apiVersion?: string;
      kind?: string;
      metadata?: {
        labels?: Record<string, string | number | boolean | null | undefined>;
      };
    };
  };
  showYaml: boolean;
  setShowYaml: (show: boolean) => void;
}

function ResourceDetails({ selectedResource, showYaml, setShowYaml }: ResourceDetailsProps) {
  return (
    <Card className="flex-1 p-4 m-4 bg-card text-card-foreground h-[calc(100vh-3rem)]" style={{ overflowWrap: 'break-word', wordWrap: 'break-word', maxWidth: '50%' }}>
      <CardHeader>
        <CardTitle className="text-xl font-bold">{selectedResource.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6 h-full flex flex-col">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="font-semibold">Type:</span>
              <span>{selectedResource.type}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold">Namespace:</span>
              <span>{selectedResource.namespace}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold">API Version:</span>
              <span>{selectedResource.details?.apiVersion}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold">Kind:</span>
              <span>{selectedResource.details?.kind}</span>
            </div>
          </div>

          {selectedResource.details?.metadata?.labels && (
            <div className="space-y-2">
              <h3 className="font-semibold">Labels:</h3>
              <div className="pl-4 space-y-1">
                {Object.entries(selectedResource.details.metadata.labels).map(([key, value]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <span className="text-sm font-medium">{key}:</span>
                    <span className="text-sm">{value as string | number | boolean | null | undefined}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex space-x-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowYaml(!showYaml)}
            >
              {showYaml ? 'Hide YAML' : 'Show YAML'}
            </Button>
            <Button
              variant="outline"
              onClick={() => navigator.clipboard.writeText(JSON.stringify(selectedResource.details, null, 2))}
            >
              Copy YAML to Clipboard
            </Button>
          </div>

          {showYaml && (
            <div className="mt-4 flex-1 overflow-y-auto max-h-80 scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-indigo-600">
              <pre className="bg-gray-900 p-4 rounded-md overflow-x-auto text-sm font-mono text-green-400" style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word', lineHeight: '1.5', maxWidth: '100%' }}>
                <code>
                  {JSON.stringify(selectedResource.details, null, 2)
                    .split('\n')
                    .map((line, i) => (
                      <span key={i} className="block" style={{ color: line.includes('"') ? '#32CD32' : '#ADFF2F' }}>
                        {line}
                      </span>
                    ))
                  }
                </code>
              </pre>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export { ResourceDetails }