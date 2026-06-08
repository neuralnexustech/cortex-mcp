import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { m } from 'framer-motion'
import { Folder, File, CheckCircle, Clock, AlertCircle } from 'lucide-react'

const statusIcons = {
  done: <CheckCircle size={16} className="text-cortex-cyan" />,
  'in-progress': <Clock size={16} className="text-cortex-yellow" />,
  pending: <File size={16} className="text-cortex-gray" />,
  broken: <AlertCircle size={16} className="text-cortex-red" />,
}

const statusVariants = {
  done: 'success',
  'in-progress': 'warning',
  pending: 'secondary',
  broken: 'destructive',
}

function FileTree({ data }) {
  const [search, setSearch] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  
  const files = data?.files || []
  const dictionary = data?.dictionary || []
  
  const filtered = search
    ? files.filter(f => f.file_path.toLowerCase().includes(search.toLowerCase()))
    : files

  const getDictionaryEntry = (filePath) => dictionary.find(d => d.key === filePath)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-heading font-bold text-white">File Tree</h2>
        <input
          type="text"
          placeholder="Search files..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-cortex-panel border border-cortex-border rounded-lg px-4 py-2 text-white w-64"
        />
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-2">
          <ScrollArea className="h-[calc(100vh-250px)]">
            {filtered.map((file) => (
              <m.div
                key={file.id}
                whileHover={{ scale: 1.01 }}
                onClick={() => setSelectedFile(file)}
                className="pr-4 mb-2"
              >
                <Card className={`glass-panel border-cortex-border cursor-pointer ${
                  selectedFile?.id === file.id ? 'ring-2 ring-cortex-cyan' : ''
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      {statusIcons[file.status] || statusIcons.pending}
                      <span className="text-white font-mono text-sm">{file.file_path}</span>
                      {file.feature_id && (
                        <Badge variant="warning" className="ml-auto">Feature #{file.feature_id}</Badge>
                      )}
                      {file.agent && (
                        <span className="text-xs text-gray-500">{file.agent}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </m.div>
            ))}
            {filtered.length === 0 && (
              <div className="text-center text-gray-500 py-8">No files found</div>
            )}
          </ScrollArea>
        </div>

        <div className="col-span-1">
          {selectedFile ? (
            <Card className="glass-panel border-cortex-border sticky top-0">
              <CardHeader>
                <CardTitle className="text-white">File Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Badge variant="info">Path</Badge>
                  <p className="text-white text-sm font-mono mt-1">{selectedFile.file_path}</p>
                </div>
                <div>
                  <Badge variant={selectedFile.status === 'done' ? 'success' : selectedFile.status === 'broken' ? 'destructive' : 'warning'}>
                    {selectedFile.status}
                  </Badge>
                </div>
                {selectedFile.feature_id && (
                  <div>
                    <Badge variant="warning">Linked Feature</Badge>
                    <p className="text-gray-400 text-sm mt-1">Feature #{selectedFile.feature_id}</p>
                  </div>
                )}
                {selectedFile.agent && (
                  <div>
                    <Badge variant="secondary">Agent</Badge>
                    <p className="text-gray-400 text-sm mt-1">{selectedFile.agent}</p>
                  </div>
                )}
                {(() => {
                  const entry = getDictionaryEntry(selectedFile.file_path)
                  if (entry) {
                    return (
                      <>
                        <Separator />
                        <div>
                          <Badge variant="info">Summary</Badge>
                          <p className="text-white text-sm mt-1">{entry.short_summary}</p>
                        </div>
                        {entry.full_description && (
                          <div>
                            <Badge variant="info">Description</Badge>
                            <p className="text-gray-400 text-sm mt-1">{entry.full_description}</p>
                          </div>
                        )}
                      </>
                    )
                  }
                  return (
                    <div className="text-xs text-gray-500 pt-2">
                      No dictionary entry — use <code className="bg-cortex-border px-1 rounded">cortex_write_dictionary</code> to add one
                    </div>
                  )
                })()}
              </CardContent>
            </Card>
          ) : (
            <Card className="glass-panel border-cortex-border">
              <CardContent className="p-4 text-center text-gray-500">
                Select a file to view details
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

export default FileTree
