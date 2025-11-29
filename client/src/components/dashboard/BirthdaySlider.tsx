"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/utils/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format, getMonth, getDate, intervalToDuration, isToday, parseISO, isSameMonth } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Cake, ChevronLeft, ChevronRight, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";

type BirthdayUser = {
    id: string;
    full_name: string;
    avatar_url: string | null;
    role: string;
    designation: string | null;
    date_of_joining: string | null;
    dob: string;
};

export function BirthdaySlider() {
    const [enabled, setEnabled] = useState(false);
    const [users, setUsers] = useState<BirthdayUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        checkFeatureAndFetchData();
    }, []);

    const checkFeatureAndFetchData = async () => {
        try {
            // 1. Check if feature is enabled
            const { data: setting } = await supabase
                .from('system_settings')
                .select('value')
                .eq('key', 'birthday_feature_enabled')
                .maybeSingle();

            if (!setting || setting.value !== 'true') {
                setLoading(false);
                return;
            }

            setEnabled(true);

            // 2. Fetch profiles and user_details
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url, role, designation, date_of_joining');

            const { data: details } = await supabase
                .from('user_details')
                .select('id, dob');

            if (!profiles || !details) return;

            // 3. Merge and Filter
            const currentMonth = getMonth(new Date());
            const today = new Date();

            const birthdayUsers = profiles
                .map(profile => {
                    const detail = details.find(d => d.id === profile.id);
                    return { ...profile, dob: detail?.dob };
                })
                .filter(user => {
                    if (!user.dob) return false;
                    const dobDate = parseISO(user.dob);
                    return getMonth(dobDate) === currentMonth;
                })
                .map(user => user as BirthdayUser)
                .sort((a, b) => {
                    // Sort by day of month
                    const dayA = getDate(parseISO(a.dob));
                    const dayB = getDate(parseISO(b.dob));

                    // If today is one of them, prioritize today
                    const isTodayA = isToday(new Date(new Date().getFullYear(), getMonth(parseISO(a.dob)), dayA));
                    const isTodayB = isToday(new Date(new Date().getFullYear(), getMonth(parseISO(b.dob)), dayB));

                    if (isTodayA && !isTodayB) return -1;
                    if (!isTodayA && isTodayB) return 1;

                    // Otherwise sort by upcoming days
                    const currentDay = getDate(today);
                    if (dayA >= currentDay && dayB < currentDay) return -1;
                    if (dayA < currentDay && dayB >= currentDay) return 1;

                    return dayA - dayB;
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

    if (loading || !enabled || users.length === 0) return null;

    const currentUser = users[currentIndex];
    const dobDate = parseISO(currentUser.dob);
    // Construct current year birthday to check if it is today
    const currentYearBirthday = new Date(new Date().getFullYear(), getMonth(dobDate), getDate(dobDate));
    const isBirthdayToday = isToday(currentYearBirthday);

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
            <Card className={`overflow-hidden border-none shadow-md ${isBirthdayToday ? 'bg-gradient-to-r from-pink-50 to-purple-50' : 'bg-white'}`}>
                <CardContent className="p-0 relative">
                    {/* Header / Title */}
                    <div className="absolute top-4 left-4 z-10 flex items-center gap-2 text-xs font-medium text-slate-500 bg-white/80 backdrop-blur-sm px-2 py-1 rounded-full">
                        <Cake className="h-3.5 w-3.5 text-pink-500" />
                        Birthdays this Month
                    </div>

                    {/* Navigation Buttons */}
                    {users.length > 1 && (
                        <>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute left-2 top-1/2 -translate-y-1/2 z-20 h-8 w-8 rounded-full bg-white/80 shadow-sm hover:bg-white"
                                onClick={prevSlide}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute right-2 top-1/2 -translate-y-1/2 z-20 h-8 w-8 rounded-full bg-white/80 shadow-sm hover:bg-white"
                                onClick={nextSlide}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </>
                    )}

                    <div className="relative h-48 sm:h-40 flex items-center justify-center p-6">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentUser.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                                className="flex flex-col sm:flex-row items-center gap-6 w-full max-w-2xl mx-auto"
                            >
                                {/* Avatar Section */}
                                <div className="relative">
                                    <div className={`rounded-full p-1 ${isBirthdayToday ? 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500' : 'bg-slate-100'}`}>
                                        <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-2 border-white">
                                            <AvatarImage src={currentUser.avatar_url || undefined} className="object-cover" />
                                            <AvatarFallback className="text-lg bg-slate-200">
                                                {currentUser.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                    </div>
                                    {isBirthdayToday && (
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="absolute -bottom-2 -right-2 bg-white p-1.5 rounded-full shadow-md"
                                        >
                                            <PartyPopper className="h-5 w-5 text-yellow-500" />
                                        </motion.div>
                                    )}
                                </div>

                                {/* Info Section */}
                                <div className="text-center sm:text-left flex-1">
                                    {isBirthdayToday && (
                                        <p className="text-pink-600 font-bold text-sm mb-1 animate-pulse">
                                            🎉 Happy Birthday!
                                        </p>
                                    )}
                                    <h3 className="text-xl font-bold text-slate-900">{currentUser.full_name}</h3>
                                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 mt-2 text-sm text-slate-600">
                                        <span className="flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                            {currentUser.designation || currentUser.role}
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                            {timeInCompany} at company
                                        </span>
                                        <span className="flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                            Joined {currentUser.date_of_joining ? format(parseISO(currentUser.date_of_joining), 'MMM yyyy') : 'N/A'}
                                        </span>
                                    </div>

                                    <div className="mt-4 flex items-center justify-center sm:justify-start gap-2">
                                        <div className="text-xs font-medium px-2.5 py-1 rounded-md bg-slate-100 text-slate-600">
                                            Birthday: {format(dobDate, 'MMMM do')}
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
