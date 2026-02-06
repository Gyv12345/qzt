import { useState } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface FlowNode {
  id: string;
  name: string;
  description?: string;
  actionType?: string;
  order: number;
}

interface FlowNodesManagerProps {
  flowId: string;
  nodes: FlowNode[];
  onNodesChange?: (nodes: FlowNode[]) => void;
}

export function FlowNodesManager({
  flowId,
  nodes,
  onNodesChange,
}: FlowNodesManagerProps) {
  const [newNodeName, setNewNodeName] = useState("");

  const handleAddNode = () => {
    if (!newNodeName.trim()) return;
    const newNode: FlowNode = {
      id: `temp-${Date.now()}`,
      name: newNodeName,
      order: nodes.length,
    };
    onNodesChange?.([...nodes, newNode]);
    setNewNodeName("");
  };

  const handleRemoveNode = (nodeId: string) => {
    onNodesChange?.(nodes.filter((n) => n.id !== nodeId));
  };

  if (nodes.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <p className="text-sm text-muted-foreground mb-4">暂无流程节点</p>
          <div className="flex gap-2 w-full max-w-xs">
            <Input
              placeholder="节点名称"
              value={newNodeName}
              onChange={(e) => setNewNodeName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddNode()}
            />
            <Button size="sm" onClick={handleAddNode}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {nodes.map((node, index) => (
        <Card key={node.id}>
          <CardContent className="flex items-center gap-3 py-3">
            <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
            <Badge variant="outline" className="text-xs">
              {index + 1}
            </Badge>
            <span className="font-medium flex-1">{node.name}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive"
              onClick={() => handleRemoveNode(node.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </CardContent>
        </Card>
      ))}
      <div className="flex gap-2">
        <Input
          placeholder="添加新节点..."
          value={newNodeName}
          onChange={(e) => setNewNodeName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddNode()}
        />
        <Button size="sm" onClick={handleAddNode}>
          <Plus className="h-4 w-4 mr-1" />
          添加
        </Button>
      </div>
    </div>
  );
}
