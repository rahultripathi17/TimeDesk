"use client";

import { AppShell } from "@/components/layout/AppShell";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, MapPin, Edit2, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type OfficeLocation = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  created_at: string;
};

export default function AdminLocationsPage() {
  const [locations, setLocations] = useState<OfficeLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [radius, setRadius] = useState("100");

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("office_locations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLocations(data || []);
    } catch (error: any) {
      toast.error("Failed to fetch locations: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const handleOpenDialog = (location?: OfficeLocation) => {
    if (location) {
      setEditingId(location.id);
      setName(location.name);
      setLatitude(location.latitude.toString());
      setLongitude(location.longitude.toString());
      setRadius(location.radius.toString());
    } else {
      setEditingId(null);
      setName("");
      setLatitude("");
      setLongitude("");
      setRadius("100");
    }
    setIsDialogOpen(true);
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    toast.info("Fetching current location...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
        toast.success("Current location fetched");
      },
      (error) => {
        toast.error("Error fetching location: " + error.message);
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);

    try {
      const payload = {
        name,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        radius: parseInt(radius),
      };

      if (editingId) {
        const { error } = await supabase
          .from("office_locations")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
        toast.success("Location updated successfully");
      } else {
        const { error } = await supabase
          .from("office_locations")
          .insert([payload]);
        if (error) throw error;
        toast.success("Location added successfully");
      }

      setIsDialogOpen(false);
      fetchLocations();
    } catch (error: any) {
      toast.error("Failed to save location: " + error.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this office location?")) return;

    try {
      const { error } = await supabase
        .from("office_locations")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      toast.success("Location deleted");
      fetchLocations();
    } catch (error: any) {
      toast.error("Failed to delete: " + error.message);
    }
  };

  return (
    <AppShell role="admin">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-8">
        <DashboardHeader
          title="Office Locations"
          action={
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Location
            </Button>
          }
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Managed Offices</CardTitle>
            <CardDescription>
              Define geo-fenced areas for Work From Office validation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : locations.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <MapPin className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                <p>No office locations defined yet.</p>
                <Button variant="link" onClick={() => handleOpenDialog()}>
                  Add your first office
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Location Name</TableHead>
                    <TableHead>Coordinates</TableHead>
                    <TableHead>Radius</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {locations.map((loc) => (
                    <TableRow key={loc.id}>
                      <TableCell className="font-medium">{loc.name}</TableCell>
                      <TableCell className="text-slate-500 text-xs">
                        {loc.latitude}, {loc.longitude}
                      </TableCell>
                      <TableCell>{loc.radius}m</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="View on Map"
                            onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}`, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4 text-blue-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(loc)}
                          >
                            <Edit2 className="h-4 w-4 text-slate-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(loc.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Office Location" : "Add Office Location"}</DialogTitle>
              <DialogDescription>
                Set the coordinates for geo-fencing.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Office Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Headquarters"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="latitude">Latitude</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="any"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="longitude">Longitude</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="any"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="button" variant="outline" size="sm" onClick={getCurrentLocation}>
                  <MapPin className="mr-2 h-3.5 w-3.5" />
                  Use Current Location
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="radius">Radius (meters)</Label>
                <Input
                  id="radius"
                  type="number"
                  value={radius}
                  onChange={(e) => setRadius(e.target.value)}
                  required
                  min="10"
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitLoading}>
                  {submitLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save Location
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
