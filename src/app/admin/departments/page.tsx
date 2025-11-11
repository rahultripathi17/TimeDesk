"use client";

import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { supabase } from "@/utils/supabase/client";
import { Pencil, Trash2, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Department = {
    name: string;
    leaveTypesCount: number;
    peopleCount: number;
};

export default function DepartmentsPage() {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const [currentDepartment, setCurrentDepartment] = useState<string | null>(null);
    const [newDepartmentName, setNewDepartmentName] = useState("");
    const [editDepartmentName, setEditDepartmentName] = useState("");

    const [actionLoading, setActionLoading] = useState(false);


    useEffect(() => {
        fetchDepartments();
    }, []);

    const fetchDepartments = async () => {
        setLoading(true);
        try {
            // 1. Fetch Departments from Leave Limits
            const { data: limitsData, error: limitsError } = await supabase
                .from('department_leave_limits')
                .select('department');

            if (limitsError) throw limitsError;

            // 2. Fetch User Counts from Profiles
            const { data: profilesData, error: profilesError } = await supabase
                .from('profiles')
                .select('department');

            if (profilesError) throw profilesError;

            if (limitsData) {
                // Group by department name and count entries (leave types)
                const deptMap = new Map<string, { leaveTypesCount: number, peopleCount: number }>();

                limitsData.forEach(item => {
                    const current = deptMap.get(item.department) || { leaveTypesCount: 0, peopleCount: 0 };
                    deptMap.set(item.department, { ...current, leaveTypesCount: current.leaveTypesCount + 1 });
                });

                // Count people per department
                if (profilesData) {
                    profilesData.forEach(profile => {
                        if (profile.department) {
                            // Only count if department exists in our limits table (to avoid orphans showing up weirdly, or maybe we should show them?)
                            // For now, let's attach counts to existing departments.
                            if (deptMap.has(profile.department)) {
                                const current = deptMap.get(profile.department)!;
                                deptMap.set(profile.department, { ...current, peopleCount: current.peopleCount + 1 });
                            }
                        }
                    });
                }

                const deptList: Department[] = Array.from(deptMap.entries()).map(([name, counts]) => ({
                    name,
                    leaveTypesCount: counts.leaveTypesCount,
                    peopleCount: counts.peopleCount
                })).sort((a, b) => a.name.localeCompare(b.name));

                setDepartments(deptList);
            }
        } catch (err: any) {
            console.error("Error fetching departments:", err);
            toast.error("Failed to load departments.");
        } finally {
            setLoading(false);
        }
    };

    const totalPages = Math.ceil(departments.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedDepartments = departments.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const handleAddDepartment = async () => {
        if (!newDepartmentName.trim()) return;
        setActionLoading(true);

        try {
            // Check if already exists
            if (departments.some(d => d.name.toLowerCase() === newDepartmentName.trim().toLowerCase())) {
                throw new Error("Department already exists");
            }

            // Insert default leave types for the new department
            // We'll add a few standard ones with 0 limit, user can edit limits later
            const defaultLeaveTypes = ['Casual Leave', 'Sick Leave', 'Privilege Leave'];
            const inserts = defaultLeaveTypes.map(type => ({
                department: newDepartmentName.trim(),
                leave_type: type,
                limit_days: 0
            }));

            const { error } = await supabase
                .from('department_leave_limits')
                .insert(inserts);

            if (error) throw error;

            toast.success("Department added successfully.");
            setIsAddDialogOpen(false);
            setNewDepartmentName("");
            fetchDepartments();

        } catch (err: any) {
            console.error("Error adding department:", err);
            toast.error(err.message || "Failed to add department.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleEditDepartment = async () => {
        if (!currentDepartment || !editDepartmentName.trim()) return;
        if (currentDepartment === editDepartmentName.trim()) {
            setIsEditDialogOpen(false);
            return;
        }

        setActionLoading(true);

        try {
            // Check if new name already exists (and isn't the current one)
            if (departments.some(d => d.name.toLowerCase() === editDepartmentName.trim().toLowerCase() && d.name !== currentDepartment)) {
                throw new Error("Department name already exists");
            }

            const { error } = await supabase
                .from('department_leave_limits')
                .update({ department: editDepartmentName.trim() })
                .eq('department', currentDepartment);

            if (error) throw error;

            toast.success("Department updated successfully.");
            setIsEditDialogOpen(false);
            fetchDepartments();

        } catch (err: any) {
            console.error("Error updating department:", err);
            toast.error(err.message || "Failed to update department.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteDepartment = async () => {
        if (!currentDepartment) return;
        setActionLoading(true);

        try {
            const { error } = await supabase
                .from('department_leave_limits')
                .delete()
                .eq('department', currentDepartment);

            if (error) throw error;

            toast.success("Department deleted successfully.");
            setIsDeleteDialogOpen(false);
            fetchDepartments();

        } catch (err: any) {
            console.error("Error deleting department:", err);
            toast.error("Failed to delete department.");
        } finally {
            setActionLoading(false);
        }
    };

    const openEditDialog = (dept: Department) => {
        setCurrentDepartment(dept.name);
        setEditDepartmentName(dept.name);
        setIsEditDialogOpen(true);
    };

    const openDeleteDialog = (dept: Department) => {
        setCurrentDepartment(dept.name);
        setIsDeleteDialogOpen(true);
    };

    return (
        <AppShell role="admin">
            <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:py-8">
                <header className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-lg font-semibold text-slate-900">Departments</h1>
                        <p className="text-xs text-slate-500">
                            Manage company departments.
                        </p>
                    </div>
                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-blue-600 hover:bg-blue-700">
                                <Plus className="mr-2 h-4 w-4" />
                                Add Department
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add New Department</DialogTitle>
                                <DialogDescription>
                                    Create a new department. Default leave types will be initialized.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Department Name</Label>
                                    <Input
                                        id="name"
                                        placeholder="e.g. Engineering"
                                        value={newDepartmentName}
                                        onChange={(e) => setNewDepartmentName(e.target.value)}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                                <Button onClick={handleAddDepartment} disabled={actionLoading || !newDepartmentName.trim()}>
                                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Department"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </header>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">All Departments</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                            </div>
                        ) : departments.length === 0 ? (
                            <div className="text-center py-8 text-slate-500 text-sm">
                                No departments found. Add one to get started.
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>People</TableHead>
                                        <TableHead>Leave Types Configured</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedDepartments.map((dept) => (
                                        <TableRow key={dept.name}>
                                            <TableCell className="font-medium">{dept.name}</TableCell>
                                            <TableCell>{dept.peopleCount}</TableCell>
                                            <TableCell>{dept.leaveTypesCount}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-slate-500 hover:text-blue-600"
                                                        onClick={() => openEditDialog(dept)}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                        <span className="sr-only">Edit</span>
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-slate-500 hover:text-red-600"
                                                        onClick={() => openDeleteDialog(dept)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                        <span className="sr-only">Delete</span>
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-end space-x-2 py-4">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                >
                                    Previous
                                </Button>
                                <div className="text-sm text-slate-600">
                                    Page {currentPage} of {totalPages}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                >
                                    Next
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Edit Dialog */}
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Edit Department</DialogTitle>
                            <DialogDescription>
                                Rename this department. This will update all related records.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-name">Department Name</Label>
                                <Input
                                    id="edit-name"
                                    value={editDepartmentName}
                                    onChange={(e) => setEditDepartmentName(e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                            <Button onClick={handleEditDepartment} disabled={actionLoading || !editDepartmentName.trim()}>
                                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Delete Dialog */}
                <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Delete Department</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete <strong>{currentDepartment}</strong>? This action cannot be undone and will remove all leave configurations for this department.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
                            <Button variant="destructive" onClick={handleDeleteDepartment} disabled={actionLoading}>
                                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete Department"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </AppShell>
    );
}
