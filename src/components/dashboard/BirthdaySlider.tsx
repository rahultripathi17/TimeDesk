"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format, intervalToDuration, isSameDay, parseISO, addDays, setYear, getYear, isBefore, isAfter, startOfDay, differenceInDays } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Cake, ChevronLeft, ChevronRight, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";

type BirthdayUser = {
    id: string;
    full_name: string;
    avatar_url: string | null;
    role: string;
    designation: string | null;
    department: string | null;
    date_of_joining: string | null;
    dob: string;
    nextBirthday: Date;
};

export function BirthdaySlider({ role }: { role: string }) {
    const [enabled, setEnabled] = useState(false);
    const [users, setUsers] = useState<BirthdayUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [isPaused, setIsPaused] = useState(false);

    useEffect(() => {
        checkFeatureAndFetchData();
    }, [role]);

    useEffect(() => {
        if (!enabled || users.length <= 1 || isPaused) return;

        const interval = setInterval(() => {
            nextSlide();
        }, 3000);

        return () => clearInterval(interval);
    }, [enabled, users.length, isPaused, currentIndex]);

    const checkFeatureAndFetchData = async () => {
        try {
            // 0. Get Current User ID
            const { data: { user: authUser } } = await supabase.auth.getUser();
            setCurrentUserId(authUser?.id || null);

            // 1. Check if feature is enabled
            let featureEnabled = true;

            if (role === 'employee') {
                const { data: setting } = await supabase
                    .from('system_settings')
                    .select('value')
                    .eq('key', 'birthday_feature_enabled')
                    .maybeSingle();

                if (!setting || setting.value !== 'true') {
                    featureEnabled = false;
                }
            }

            if (!featureEnabled) {
                setLoading(false);
                return;
            }

            setEnabled(true);

            // 2. Fetch data using RPC to bypass RLS
            const { data: allUsers, error } = await supabase
                .rpc('get_all_birthdays');

            if (error) {
                console.error("Error fetching birthdays via RPC:", error);
                setLoading(false);
                return;
            }

            if (!allUsers) return;

            // 3. Filter and Process (Next 7 Days)
            const today = startOfDay(new Date());
            const windowEnd = addDays(today, 7);
            const currentYear = getYear(today);

            const birthdayUsers = (allUsers as any[])
                .map(user => {
                    if (!user.dob) return null;

                    const dobDate = parseISO(user.dob);

                    // Calculate next birthday
                    let nextBirthday = setYear(dobDate, currentYear);
                    // If birthday has passed this year (strictly before today), set to next year
                    if (isBefore(nextBirthday, today)) {
                        nextBirthday = setYear(dobDate, currentYear + 1);
                    }

                    return {
                        id: user.id,
                        full_name: user.full_name,
                        avatar_url: user.avatar_url,
                        role: user.role,
                        designation: user.designation,
                        department: user.department,
                        date_of_joining: user.date_of_joining,
                        dob: user.dob,
                        nextBirthday
                    };
                })
                .filter((user): user is BirthdayUser => {
                    if (!user) return false;

                    const isAfterOrSameToday = isAfter(user.nextBirthday, today) || isSameDay(user.nextBirthday, today);
                    const isBeforeOrSameEnd = isBefore(user.nextBirthday, windowEnd) || isSameDay(user.nextBirthday, windowEnd);

                    return isAfterOrSameToday && isBeforeOrSameEnd;
                })
                .sort((a, b) => {
                    return a.nextBirthday.getTime() - b.nextBirthday.getTime();
                });

            setUsers(birthdayUsers);
        } catch (error) {
            console.error("Error fetching birthday data:", error);
        } finally {
            setLoading(false);
        }
    };

    const nextSlide = () => {
        setCurrentIndex((prev) => (prev + 1) % users.length);
    };

    const prevSlide = () => {
        setCurrentIndex((prev) => (prev - 1 + users.length) % users.length);
    };

    if (loading || !enabled) return null;

    if (users.length === 0) {
        return (
            <div className="mb-6">
                <Card className="border-dashed border-slate-300 shadow-sm bg-slate-50/50">
                    <CardContent className="flex flex-col items-center justify-center p-6 text-center text-slate-500">
                        <Cake className="h-8 w-8 mb-2 text-slate-300" />
                        <p className="text-sm font-medium">No upcoming birthdays</p>
                        <p className="text-xs text-slate-400">Birthdays in the next 7 days will appear here.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const currentUser = users[currentIndex];
    const isBirthdayToday = isSameDay(currentUser.nextBirthday, new Date());
    const isMyBirthday = currentUser.id === currentUserId;

    // Relative Date Logic
    const getRelativeDate = (date: Date) => {
        const today = startOfDay(new Date());
        const diff = differenceInDays(date, today);

        if (diff === 0) return "Today";
        if (diff === 1) return "Tomorrow";
        if (diff < 7) return format(date, 'EEEE');
        return format(date, 'MMMM do');
    };

    const relativeDate = getRelativeDate(currentUser.nextBirthday);

    const timeInCompany = currentUser.date_of_joining ? (() => {
        const duration = intervalToDuration({
            start: parseISO(currentUser.date_of_joining),
            end: new Date()
        });
        const years = duration.years || 0;
        const months = duration.months || 0;
        if (years === 0 && months === 0) return "Just joined";
        return `${years > 0 ? `${years} year${years > 1 ? 's' : ''} ` : ''}${months > 0 ? `${months} month${months > 1 ? 's' : ''}` : ''}`;
    })() : "N/A";

    return (
        <div className="mb-6">
            <Card
                className={`overflow-hidden border-none shadow-md ${isBirthdayToday ? 'bg-gradient-to-r from-pink-50 to-purple-50' : 'bg-white'}`}
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
            >
                <CardContent className="p-0 relative flex flex-col h-full">
                    {/* Header / Title - Now Relative */}
                    <div className="flex items-center justify-between px-4 pt-4 pb-2 z-10">
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 bg-white/80 backdrop-blur-sm px-2 py-1 rounded-full shadow-sm border border-slate-100">
                            <Cake className="h-3.5 w-3.5 text-pink-500" />
                            Upcoming Birthdays
                        </div>
                    </div>

                    {/* Navigation Buttons */}
                    {users.length > 1 && (
                        <>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute left-2 top-1/2 -translate-y-1/2 z-20 h-8 w-8 rounded-full bg-white/80 shadow-sm hover:bg-white hidden sm:flex"
                                onClick={prevSlide}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute right-2 top-1/2 -translate-y-1/2 z-20 h-8 w-8 rounded-full bg-white/80 shadow-sm hover:bg-white hidden sm:flex"
                                onClick={nextSlide}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </>
                    )}

                    <div className="relative min-h-[180px] flex items-center justify-center p-4 sm:p-6 pb-8 sm:pb-6">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentUser.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                                className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8 w-full max-w-3xl mx-auto px-2 sm:px-8"
                            >
                                {/* Avatar Section */}
                                <div className="relative flex-shrink-0">
                                    <div className={`rounded-full p-1 ${isBirthdayToday ? 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500' : 'bg-slate-100'}`}>
                                        <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-2 border-white">
                                            <AvatarImage
                                                src={(currentUser.avatar_url && currentUser.avatar_url !== "NULL" && currentUser.avatar_url !== "null") ? currentUser.avatar_url : undefined}
                                                className="object-cover"
                                            />
                                            <AvatarFallback className="text-lg bg-slate-200">
                                                {currentUser.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                    </div>
                                    {isBirthdayToday && (
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="absolute -bottom-1 -right-1 bg-white p-1.5 rounded-full shadow-md z-10"
                                        >
                                            <PartyPopper className="h-4 w-4 text-yellow-500" />
                                        </motion.div>
                                    )}
                                </div>

                                {/* Info Section */}
                                <div className="text-center sm:text-left flex-1 min-w-0 w-full">
                                    {isBirthdayToday && (
                                        <p className="text-pink-600 font-bold text-sm mb-1 animate-pulse flex items-center justify-center sm:justify-start gap-1.5">
                                            <span>🎉</span>
                                            {isMyBirthday ? "Happy Birthday to You!" : `Happy Birthday, ${currentUser.full_name.split(' ')[0]}!`}
                                        </p>
                                    )}
                                    <h3 className="text-xl sm:text-2xl font-bold text-slate-900 truncate">{currentUser.full_name}</h3>
                                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-2 mt-2 text-sm text-slate-600">
                                        <span className="flex items-center gap-1.5 whitespace-nowrap bg-slate-100/50 px-2 py-0.5 rounded-full">
                                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                            {currentUser.designation || currentUser.role}
                                        </span>
                                        {currentUser.department && (
                                            <span className="flex items-center gap-1.5 whitespace-nowrap bg-slate-100/50 px-2 py-0.5 rounded-full">
                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                                {currentUser.department}
                                            </span>
                                        )}
                                        <span className="flex items-center gap-1.5 whitespace-nowrap bg-slate-100/50 px-2 py-0.5 rounded-full">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                            {timeInCompany} at company
                                        </span>
                                    </div>

                                    <div className="mt-4 flex items-center justify-center sm:justify-start gap-2">
                                        <div className={`text-xs font-medium px-3 py-1.5 rounded-full ${isBirthdayToday ? 'bg-pink-100 text-pink-700' : 'bg-slate-100 text-slate-600'}`}>
                                            {relativeDate} • {format(currentUser.nextBirthday, 'MMMM do')}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Dots Indicator */}
                    <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                        {users.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentIndex(idx)}
                                className={`w-1.5 h-1.5 rounded-full transition-all ${idx === currentIndex ? 'bg-slate-800 w-3' : 'bg-slate-300'
                                    }`}
                            />
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
