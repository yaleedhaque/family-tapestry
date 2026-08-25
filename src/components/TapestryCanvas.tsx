"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import ELK from "elkjs/lib/elk.bundled.js";

import PersonNode from "@/components/PersonNode";
import UnionNode from "@/components/UnionNode";
import DetailDrawer from "@/components/DetailDrawer";
import { persons, unions, parentEdges, type Person } from "@/data/family";

const nodeTypes = { personNode: PersonNode, unionNode: UnionNode };

const elk = new ELK();
const ELK_OPTIONS = {
  "elk.algorithm": "layered",
  "elk.direction": "DOWN",
  "elk.layered.spacing.nodeNodeBetweenLayers": "80",
  "elk.layered.spacing.nodeNode": "60",
  "elk.spacing.nodeNode": "40",
  "elk.padding": "40",
};

export default function TapestryCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);

  useEffect(() => {
    const buildGraph = async () => {
      const flowNodes: Node[] = [];
      const flowEdges: Edge[] = [];

      // Person nodes
      for (const person of persons) {
        flowNodes.push({
          id: person.id,
          type: "personNode",
          data: { person },
          position: { x: 0, y: 0 },
        });
      }

      // Union nodes + edges from union → children + edges from partners → union
      for (const union of unions) {
        const unionNodeId = union.id;

        flowNodes.push({
          id: unionNodeId,
          type: "unionNode",
          data: { union },
          position: { x: 0, y: 0 },
        });

        // Partner A → Union
        flowEdges.push({
          id: `${union.partnerA}-${unionNodeId}`,
          source: union.partnerA,
          target: unionNodeId,
          type: "smoothstep",
          style: { stroke: "var(--thread-gold)", strokeWidth: 1.5, opacity: 0.6 },
          markerEnd: { type: MarkerType.ArrowClosed, color: "var(--thread-gold-dim)", width: 12, height: 12 },
        });

        // Partner B → Union
        flowEdges.push({
          id: `${union.partnerB}-${unionNodeId}`,
          source: union.partnerB,
          target: unionNodeId,
          type: "smoothstep",
          style: { stroke: "var(--thread-gold)", strokeWidth: 1.5, opacity: 0.6 },
          markerEnd: { type: MarkerType.ArrowClosed, color: "var(--thread-gold-dim)", width: 12, height: 12 },
        });
      }

      // Union → Children edges
      for (const edge of parentEdges) {
        flowEdges.push({
          id: `${edge.unionId}-${edge.childId}`,
          source: edge.unionId,
          target: edge.childId,
          type: "smoothstep",
          style: { stroke: "var(--thread-gold)", strokeWidth: 1.5, opacity: 0.6 },
          markerEnd: { type: MarkerType.ArrowClosed, color: "var(--thread-gold-dim)", width: 12, height: 12 },
        });
      }

      // ELK layout
      const elkGraph = {
        id: "root",
        children: flowNodes.map((n) => ({ id: n.id })),
        edges: flowEdges.map((e) => ({
          id: e.id,
          sources: [e.source],
          targets: [e.target],
        })),
      };

      const layout = await elk.layout(elkGraph, { layoutOptions: ELK_OPTIONS });

      if (layout.children) {
        for (const elkNode of layout.children) {
          const flowNode = flowNodes.find((n) => n.id === elkNode.id);
          if (flowNode && elkNode.x !== undefined && elkNode.y !== undefined) {
            flowNode.position = { x: elkNode.x, y: elkNode.y };
          }
        }
      }

      setNodes(flowNodes);
      setEdges(flowEdges);
    };

    buildGraph();
  }, [setNodes, setEdges]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.type === "personNode") {
        const person = node.data.person as Person;
        setSelectedPerson(person);
      }
    },
    []
  );

  return (
    <div className="w-full h-screen relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{
          type: "smoothstep",
          style: { stroke: "var(--thread-gold)", strokeWidth: 1.5, opacity: 0.6 },
        }}
        className="bg-tapestry-bg"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="var(--thread-gold-dim)"
          style={{ opacity: 0.2 }}
        />
        <Controls
          className="!bg-tapestry-bg-alt !border-thread-gold-dim !rounded-lg"
          showInteractive={false}
        />
      </ReactFlow>

      <DetailDrawer person={selectedPerson} onClose={() => setSelectedPerson(null)} />
    </div>
  );
}
