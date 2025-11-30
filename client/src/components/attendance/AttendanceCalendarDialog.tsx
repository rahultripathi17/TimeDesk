"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AttendanceCalendar } from "./AttendanceCalendar";

interface AttendanceCalendarDialogProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string | null;
    userName: string;
    userAvatar?: string | null;
}

export function AttendanceCalendarDialog({
    isOpen,
    onClose,
    userId,
    userName,
    userAvatar,
}: AttendanceCalendarDialogProps) {

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={userAvatar || ""} />
                            <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                                {getInitials(userName)}
                            </AvatarFallback>
                        </Avatar>
                        <span>{userName}'s Attendance</span>
                    </DialogTitle>
                </DialogHeader>

                <div className="mt-4">
                    {userId && <AttendanceCalendar userId={userId} />}
                </div>
            </DialogContent>
        </Dialog>
    );
}
