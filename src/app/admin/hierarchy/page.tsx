"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Network, UserCog, ArrowUp, Zap, Trash2, Maximize, Minimize, Plus, Minus, X as XIcon } from "lucide-react";

type Profile = {
  id: string;
  full_name: string;
  role: "admin" | "hr" | "manager" | "employee";
  department: string | null;
  designation: string | null;
  avatar_url: string | null;
  reporting_managers: string[] | null;
  email: string | null;
};

export default function HierarchyPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [newManagerIds, setNewManagerIds] = useState<string[]>([]);
  // const [isSeeding, setIsSeeding] = useState(false);
  // const [forceShowAll, setForceShowAll] = useState(false);


  const supabase = createClient();

  const fetchProfiles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, role, department, designation, avatar_url, reporting_managers, email")
      .order("role");

    if (error) {
      toast.error(`Failed to load: ${error.message}`);
    } else {
      // @ts-ignore
      setProfiles(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProfiles();
  }, []);



  const handleAssignManager = async () => {
    if (!selectedUser) return;
    const updatedManagers = newManagerIds;

    // Optimistic update
    setProfiles(prev => prev.map(p => 
        p.id === selectedUser.id ? { ...p, reporting_managers: updatedManagers } : p
    ));

    try {
        const res = await fetch("/api/admin/update-manager", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: selectedUser.id, managerIds: updatedManagers }),
        });

        if (!res.ok) {
            throw new Error("API Update failed");
        }

        toast.success(`Updated reporting line for ${selectedUser.full_name}`);
        setAssignModalOpen(false);
        setTimeout(fetchProfiles, 500);
    } catch (error) {
        toast.error("Failed to update manager");
        fetchProfiles(); // Revert on error
    }
  };

  const openAssignModal = (user: Profile) => {
    setSelectedUser(user);
    // Initialize with existing managers or empty array
    setNewManagerIds(user.reporting_managers || []);
    setAssignModalOpen(true);
  };

  const toggleManager = (managerId: string) => {
      setNewManagerIds(prev => 
          prev.includes(managerId) 
              ? prev.filter(id => id !== managerId) 
              : [...prev, managerId]
      );
  };


  // --- Zoom & Pan ---
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [isFullScreen, setIsFullScreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.2));

  const handleWheel = (e: React.WheelEvent) => {
      // Zoom on Control + Wheel or just Wheel if specific mode? 
      // User asked for "mouse control", usually wheel = zoom, drag = pan.
      if (e.ctrlKey) {
          e.preventDefault();
          const delta = e.deltaY > 0 ? -0.1 : 0.1;
          setZoom(prev => Math.min(Math.max(prev + delta, 0.2), 3));
      } else {
          // Pan on wheel if not ctrl? Standard is vertical scroll. 
          // But for infinite canvas, wheel usually zooms or pans vertically.
          // Let's stick to Drag for Pan, Wheel for Zoom (Canva style typically uses Ctrl+Wheel to zoom, Wheel to pan).
          // Actually Canva: Wheel = Scroll (Pan), Ctrl+Wheel = Zoom.
          e.preventDefault();
          setPan(prev => ({ x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
      }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
      if (e.button !== 0) return; // Only left click
      setIsDragging(true);
      setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - lastMousePos.x;
      const dy = e.clientY - lastMousePos.y;
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
      setIsDragging(false);
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
        containerRef.current?.requestFullscreen().catch((err) => {
            console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
        });
        setIsFullScreen(true);
    } else {
        document.exitFullscreen();
        setIsFullScreen(false);
    }
  };

  useEffect(() => {
    const handleRemoteChange = () => {
       setIsFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleRemoteChange);
    return () => document.removeEventListener("fullscreenchange", handleRemoteChange);
  }, []);

  // --- Graph Construction & Analysis ---
  const managerMap = new Map<string, string[]>(); // Manager ID -> Child IDs
  const parentMap = new Map<string, string[]>();  // Child ID -> Manager IDs
  const profileMap = new Map<string, Profile>();
  
  profiles.forEach((p) => profileMap.set(p.id, p));

  // Build Graph Relationships
  profiles.forEach((p) => {
    // If no managers, skipping (handled in roots)
    const mgrIds = p.reporting_managers || [];
    if (mgrIds.length > 0) {
        let hasValidManager = false;
        mgrIds.forEach(mgrId => {
            if (profileMap.has(mgrId) && mgrId !== p.id) {
                if (!managerMap.has(mgrId)) managerMap.set(mgrId, []);
                managerMap.get(mgrId)?.push(p.id);
                
                if (!parentMap.has(p.id)) parentMap.set(p.id, []);
                parentMap.get(p.id)?.push(mgrId);
                hasValidManager = true;
            }
        });
    }
  });

  // Calculate Levels (Rank)
  const levels = new Map<string, number>();
  const processed = new Set<string>();
  const queue: { id: string; level: number }[] = [];

  // Identify Roots (No parents in the current set or Admin/HR fallback)
  const potentialRoots = profiles.filter(p => {
      const parents = parentMap.get(p.id);
      const hasParents = parents && parents.length > 0;
      
      if (hasParents) return false;

      // It is a root if it has no parents AND (it has children OR it is an Admin/HR)
      const hasChildren = managerMap.has(p.id) && managerMap.get(p.id)!.length > 0;
      
      if (hasChildren) return true;
      if (p.role === 'admin' || p.role === 'hr') return true;
      
      return false; // Isolated leaf node -> Unassigned
  });
  
  // Prioritize Admin/HR as level 0 if possible, but structure dictates first
  potentialRoots.forEach(r => {
      levels.set(r.id, 0);
      queue.push({ id: r.id, level: 0 });
      processed.add(r.id);
  });
  
  // BFS to assign levels
  while (queue.length > 0) {
      const { id, level } = queue.shift()!;
      const children = managerMap.get(id) || [];
      
      children.forEach(childId => {
          const currentLevel = levels.get(childId) || 0;
          const newLevel = level + 1;
          
          if (newLevel > currentLevel) {
              levels.set(childId, newLevel);
              if (!queue.some(q => q.id === childId)) { // optimization
                  queue.push({ id: childId, level: newLevel });
              }
          }
           processed.add(childId);
      });
  }

  // Create Layers for Rendering
  const layers: Profile[][] = [];
  processed.forEach(id => {
      const level = levels.get(id) || 0;
      if (!layers[level]) layers[level] = [];
      const p = profileMap.get(id);
      if (p) layers[level].push(p);
  });
  
  // Sort layers to minimize crossings (Barycentric Heuristic)
  // 1. First layer (roots) sorted by Role/Name
  if(layers[0]) {
      layers[0].sort((a,b) => (a.role === 'admin' ? -1 : 1) || a.full_name.localeCompare(b.full_name));
  }

  // 2. Subsequent layers sorted by average parent position
  for (let i = 1; i < layers.length; i++) {
      const prevLayer = layers[i-1];
      const currentLayer = layers[i];
      if (!currentLayer || !prevLayer) continue;

      // Map parent IDs to their index in the previous layer
      const parentPos = new Map<string, number>();
      prevLayer.forEach((p, idx) => parentPos.set(p.id, idx));

      currentLayer.sort((a, b) => {
          const getAvgParentPos = (pid: string) => {
              const parents = parentMap.get(pid) || [];
              if (parents.length === 0) return -1;
              let sum = 0;
              let count = 0;
              parents.forEach(mgrId => {
                  if (parentPos.has(mgrId)) {
                      sum += parentPos.get(mgrId)!;
                      count++;
                  }
              });
              return count === 0 ? 999 : sum / count;
          };

          const posA = getAvgParentPos(a.id);
          const posB = getAvgParentPos(b.id);
          
          // If positions are equal (same parents), sort by name
          if (Math.abs(posA - posB) < 0.01) {
              return a.full_name.localeCompare(b.full_name);
          }
          return posA - posB;
      });
  }

  const unassignedProfiles = profiles.filter(p => !processed.has(p.id));

  // Refs for drawing lines
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [lines, setLines] = useState<{ x1: number, y1: number, x2: number, y2: number, key: string }[]>([]);

  // Update Lines Effect (Show ALL Direct Managers)
  useEffect(() => {
     const timer = setTimeout(() => {
         // Need container rect to calculate relative positions properly
         if (!containerRef.current) return;
         const containerRect = containerRef.current.getBoundingClientRect();

         const newLines: { x1: number, y1: number, x2: number, y2: number, key: string }[] = [];
         
         // Iterate parents to children
         managerMap.forEach((children, parentId) => {
             const parentEl = cardRefs.current.get(parentId);
             if (!parentEl) return;
             
             children.forEach(childId => {
                 const childEl = cardRefs.current.get(childId);
                 if (!childEl) return;
                 
                 const pRect = parentEl.getBoundingClientRect();
                 const cRect = childEl.getBoundingClientRect();

                 // Calculate relative coordinates inside the zoomed container
                 // Formula: (ScreenPos - ContainerScreenPos - PanOffset) / Zoom
                 const pX = (pRect.left + pRect.width / 2 - containerRect.left - pan.x) / zoom;
                 const pY = (pRect.bottom - containerRect.top - pan.y) / zoom;
                 
                 const cX = (cRect.left + cRect.width / 2 - containerRect.left - pan.x) / zoom;
                 const cY = (cRect.top - containerRect.top - pan.y) / zoom;
                 
                 newLines.push({ x1: pX, y1: pY, x2: cX, y2: cY, key: `${parentId}-${childId}` });
             });
         });
         setLines(newLines);
     }, 100); // Small debounce/delay to allow layout to settle
     return () => clearTimeout(timer);
  }, [profiles, layers, zoom, pan, isFullScreen]); // Added pan to dependencies as it affects calculation if using Rects

  const [hoveredProfileId, setHoveredProfileId] = useState<string | null>(null);

  const roleStyles = {
      admin: { bg: "bg-gradient-to-br from-red-50 to-white", border: "border-red-200", text: "text-red-900", badge: "bg-red-100 text-red-700" },
      hr: { bg: "bg-gradient-to-br from-blue-50 to-white", border: "border-blue-200", text: "text-blue-900", badge: "bg-blue-100 text-blue-700" },
      manager: { bg: "bg-gradient-to-br from-emerald-50 to-white", border: "border-emerald-200", text: "text-emerald-900", badge: "bg-emerald-100 text-emerald-700" },
      employee: { bg: "bg-gradient-to-br from-amber-50 to-white", border: "border-amber-200", text: "text-amber-900", badge: "bg-amber-100 text-amber-800" },
  };
  
  const NodeCard = ({ profile }: { profile: Profile }) => {
      const style = roleStyles[profile.role] || { bg: "bg-white", border: "border-slate-200", text: "text-slate-700", badge: "bg-slate-100 text-slate-600" };
      const isDimmed = hoveredProfileId && hoveredProfileId !== profile.id && !managerMap.get(profile.id)?.includes(hoveredProfileId) && !managerMap.get(hoveredProfileId)?.includes(profile.id);

      return (
        <div 
            ref={(el) => {
                if(el) cardRefs.current.set(profile.id, el);
                else cardRefs.current.delete(profile.id);
            }}
            onMouseEnter={() => setHoveredProfileId(profile.id)}
            onMouseLeave={() => setHoveredProfileId(null)}
            className={`
            relative group flex flex-col items-center p-4 rounded-2xl border shadow-sm 
            w-[240px] z-10 box-border
            ${style.bg} ${style.border}
            ${hoveredProfileId === profile.id ? "shadow-xl ring-2 ring-indigo-400 z-50 bg-white" : "hover:shadow-lg"}
            ${isDimmed ? "opacity-40 blur-[1px]" : "opacity-100"}
        `}>
            {/* Action Button - Replaced with native button for reliability */}
            <div className="absolute top-2 right-2 z-[100]">
                <button 
                    className="flex items-center justify-center h-7 w-7 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 shadow-sm transition-colors cursor-pointer" 
                    onMouseDown={(e) => { 
                        e.stopPropagation(); 
                        openAssignModal(profile); 
                    }}
                >
                     <UserCog className="h-4 w-4 text-slate-700 pointer-events-none" />
                </button>
            </div>
            
            <div className="mb-1">
                <Avatar className="h-14 w-14 border-4 border-white shadow-md ring-1 ring-slate-100">
                    <AvatarImage src={profile.avatar_url || ""} />
                    <AvatarFallback className="bg-slate-100 text-slate-600 font-bold">{profile.full_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
            </div>

            <div className={`
                px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm border border-slate-100 mb-1
                ${style.badge}
            `}>
                {profile.role}
            </div>
            
            <div className="text-center w-full mt-0.5 pointer-events-none">
                <h3 className={`font-bold text-sm truncate ${style.text}`}>{profile.full_name}</h3>
                <p className="text-xs text-slate-500 truncate mt-0.5 font-medium">
                    {profile.designation || profile.role} 
                    {profile.department && <span className="text-slate-400"> • {profile.department}</span>}
                </p>
                <div className="mt-1 text-[10px] text-slate-400 truncate">
                    {profile.email}
                </div>
            </div>
        </div>
      );
  };
  
  // Custom Reset View
  const handleResetView = () => {
      setZoom(1);
      setPan({ x: 0, y: 0 });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-50/50 overflow-hidden">
      {/* Header */}
      {!isFullScreen && (
        <div className="flex items-center justify-between px-8 py-4 bg-white border-b z-20 shadow-sm shrink-0">
            <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Organization Hierarchy</h1>
            <p className="text-slate-500 text-sm mt-1">
                {profiles.length} Employees • {unassignedProfiles.length} Unassigned
            </p>
            </div>
            <div className="flex gap-3 items-center">
                <Button onClick={fetchProfiles} variant="outline" size="sm">
                    <Network className="mr-2 h-4 w-4" />
                    Refresh
                </Button>
            </div>
        </div>
      )}

      {/* Infinite Canvas Container */}
      <div 
          ref={containerRef}
          className={`relative flex-1 bg-slate-100 overflow-hidden cursor-grab active:cursor-grabbing select-none ${isFullScreen ? "h-screen w-screen" : ""}`}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
      >
          {/* Grid Background Pattern */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
               style={{
                   backgroundImage: `radial-gradient(#000 1px, transparent 1px)`,
                   backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
                   backgroundPosition: `${pan.x}px ${pan.y}px`
               }} 
          />

          {/* Controls Toolbar - Positioned Top Right */}
          <div className="absolute top-6 right-6 z-50 flex flex-col gap-2 p-1.5 bg-white shadow-xl border rounded-lg ring-1 ring-slate-900/5">
              <Button variant="ghost" size="icon" onClick={handleZoomIn} title="Zoom In">
                  <Plus className="h-4 w-4" />
              </Button>
              <div className="text-xs font-mono py-1 text-center font-medium border-y border-slate-100 text-slate-500">
                  {Math.round(zoom * 100)}%
              </div>
              <Button variant="ghost" size="icon" onClick={handleZoomOut} title="Zoom Out">
                  <Minus className="h-4 w-4" />
              </Button>
              <div className="h-px bg-slate-200 my-1" />
              <Button variant="ghost" size="icon" onClick={handleResetView} title="Reset View">
                   <Zap className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggleFullScreen}
                title={isFullScreen ? "Exit Full Screen" : "Full Screen"}
                className={isFullScreen ? "text-indigo-600 bg-indigo-50" : ""}
              >
                  {isFullScreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              </Button>
          </div>

          {/* Canvas Content Layer */}
          <div 
            style={{ 
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, 
                transformOrigin: '0 0', 
                transition: isDragging ? 'none' : 'transform 0.1s ease-out' 
            }} 
            className="absolute top-0 left-0 w-full h-full" // Use exact coords
          >
                 
                 {/* 1. Main Hierarchy Tree (Centered initially effectively by layout, but we pan to move) */}
                 <div className="relative min-w-max mx-auto pt-20 pb-40 px-20 flex flex-col items-center">
                     
                     {/* Lines SVG */}
                     <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" style={{ zIndex: 0 }}>
                         <defs>
                             <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                                 <polygon points="0 0, 6 2, 0 4" fill="#cbd5e1" />
                             </marker>
                             <marker id="arrowhead-active" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                                 <polygon points="0 0, 6 2, 0 4" fill="#6366f1" />
                             </marker>
                         </defs>
                         {lines.map((line) => {
                             const isActive = hoveredProfileId && (line.key.startsWith(hoveredProfileId + '-') || line.key.endsWith('-' + hoveredProfileId));
                             const isFaded = hoveredProfileId && !isActive;
                             
                             return (
                                 <path
                                     key={line.key}
                                     d={`M ${line.x1} ${line.y1} C ${line.x1} ${line.y1 + 80}, ${line.x2} ${line.y2 - 80}, ${line.x2} ${line.y2}`}
                                     stroke={isActive ? "#6366f1" : "#cbd5e1"}
                                     strokeWidth={isActive ? "3" : "2"}
                                     fill="none"
                                     markerEnd={isActive ? "url(#arrowhead-active)" : "url(#arrowhead)"}
                                     className={`transition-all duration-300 ${isFaded ? "opacity-10" : "opacity-100"}`}
                                 />
                             );
                         })}
                     </svg>

                     {/* Cards Layers */}
                     <div className="flex flex-col gap-24 relative z-10 items-center">
                         {layers.map((layer, lvlIndex) => (
                             <div key={lvlIndex} className="flex justify-center gap-16">
                                 {layer.map(profile => (
                                     <NodeCard key={profile.id} profile={profile} />
                                 ))}
                             </div>
                         ))}
                         {layers.length === 0 && (
                             <div className="text-center text-slate-400 p-10 bg-white/50 rounded-xl border border-dashed">No hierarchy data available</div>
                         )}
                     </div>

                     {/* 2. Unassigned Users Section (On the same canvas, below the tree) */}
                     {unassignedProfiles.length > 0 && (
                        <div className="mt-32 pt-12 border-t-2 border-dashed border-slate-200 w-full max-w-5xl">
                            <h2 className="text-lg font-bold text-slate-400 mb-8 flex items-center justify-center gap-2 uppercase tracking-widest text-center">
                                <UserCog className="h-5 w-5" />
                                Unassigned / Disconnected
                            </h2>
                            
                            <div className="flex flex-wrap justify-center gap-6 opacity-80">
                                {unassignedProfiles.map(p => (
                                    <div key={p.id} className="scale-90 opacity-70 hover:opacity-100 transition-opacity">
                                        <NodeCard profile={p} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                 </div>
          </div>
      </div>




      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent container={isFullScreen ? containerRef.current : null} className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Change Reporting Manager</DialogTitle>
                <DialogDescription>
                    Assign managers for <strong>{selectedUser?.full_name}</strong>.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                 {/* Selected Managers Tags Area */}
                 <div className="space-y-2">
                    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Selected Managers ({newManagerIds.length})
                    </Label>
                    <div className="flex flex-wrap gap-2 min-h-[40px] p-2 bg-slate-50 border rounded-md">
                        {newManagerIds.length === 0 && (
                            <span className="text-sm text-slate-400 italic self-center">No managers selected</span>
                        )}
                        {newManagerIds.map(id => {
                            const mgr = profiles.find(p => p.id === id);
                            if (!mgr) return null;
                            return (
                                <Badge key={id} variant="secondary" className="pl-2 pr-1 py-1 flex items-center gap-1 bg-white border border-slate-200 shadow-sm text-slate-700 hover:bg-slate-50">
                                    {mgr.full_name}
                                    <button 
                                        onClick={() => toggleManager(id)}
                                        className="ml-1 hover:bg-slate-200 rounded-full p-0.5 transition-colors"
                                    >
                                        <XIcon className="h-3 w-3 text-slate-400 hover:text-red-500" />
                                    </button>
                                </Badge>
                            );
                        })}
                    </div>
                 </div>

                 <div className="space-y-2">
                    <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Available Managers</Label>
                    <div className="bg-white border rounded-lg max-h-[240px] overflow-y-auto p-1 space-y-1">
                        {profiles
                            .filter(p => p.id !== selectedUser?.id && p.role !== 'employee') // Prevent self-assignment and exclude employees
                            .map(p => {
                                const isSelected = newManagerIds.includes(p.id);
                                return (
                                    <div 
                                        key={p.id} 
                                        className={`flex items-center gap-3 p-2 rounded-md transition-all cursor-pointer border border-transparent ${isSelected ? "bg-slate-50 border-slate-200" : "hover:bg-slate-50"}`}
                                        onClick={() => toggleManager(p.id)}
                                    >
                                        <Checkbox 
                                            checked={isSelected}
                                            onCheckedChange={() => toggleManager(p.id)}
                                            id={`mgr-${p.id}`}
                                            className="border-slate-300 data-[state=checked]:bg-slate-900 data-[state=checked]:border-slate-900"
                                        />
                                        <div className="flex items-center gap-3 select-none flex-1">
                                            <Avatar className="h-8 w-8 ring-1 ring-slate-100">
                                                <AvatarImage src={p.avatar_url || ""} />
                                                <AvatarFallback className="text-xs font-medium text-slate-600 bg-slate-100">{p.full_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium leading-none text-slate-900 truncate">{p.full_name}</p>
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    <span className={`text-[10px] px-1.5 py-px rounded uppercase font-bold tracking-wide border ${
                                                        roleStyles[p.role]?.badge.replace('bg-', 'bg-opacity-50 ') || "bg-slate-100 text-slate-600 border-slate-200"
                                                    }`}>
                                                        {p.role}
                                                    </span>
                                                    {p.department && <span className="text-xs text-slate-400 truncate">• {p.department}</span>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                 </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setAssignModalOpen(false)}>Cancel</Button>
                <Button onClick={handleAssignManager} className="bg-slate-900 hover:bg-slate-800 text-white">Save Changes</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
