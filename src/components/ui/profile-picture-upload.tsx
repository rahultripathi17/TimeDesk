"use client";

import { useState, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageCropper } from "@/components/ui/image-cropper";
import { User, Camera, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface ProfilePictureUploadProps {
    currentImage: string | null;
    name: string;
    onImageChange: (file: File | null, previewUrl: string | null) => void;
    onRemove: () => void;
}

export function ProfilePictureUpload({ currentImage, name, onImageChange, onRemove }: ProfilePictureUploadProps) {
    const [isCropperOpen, setIsCropperOpen] = useState(false);
    const [tempImageSrc, setTempImageSrc] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const getInitials = (name: string) => {
        if (!name) return "";
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .substring(0, 2);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 150 * 1024) { // 150KB
            toast.error("Image size must be less than 150KB");
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            setTempImageSrc(reader.result as string);
            setIsCropperOpen(true);
        };
        reader.readAsDataURL(file);

        // Reset input to allow selecting same file again
        e.target.value = "";
    };

    const handleCropComplete = async (croppedImage: string) => {
        try {
            // Convert base64/blob URL to File object
            const response = await fetch(croppedImage);
            const blob = await response.blob();
            const file = new File([blob], "profile-pic.jpg", { type: "image/jpeg" });

            onImageChange(file, croppedImage);
            toast.success("Image cropped successfully");
        } catch (error) {
            console.error("Error processing cropped image:", error);
            toast.error("Failed to process image");
        }
    };

    const handleRemove = () => {
        onRemove();
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    return (
        <div className="flex items-center gap-6">
            <div className="relative h-24 w-24 shrink-0">
                <Avatar className="h-24 w-24 border-4 border-white shadow-sm">
                    {currentImage && <AvatarImage src={currentImage} className="object-cover" />}
                    <AvatarFallback className="text-3xl bg-blue-50 text-blue-600 font-semibold">
                        {name ? getInitials(name) : <User className="h-8 w-8" />}
                    </AvatarFallback>
                </Avatar>
            </div>
            <div className="space-y-3">
                <div className="flex gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-2"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Camera className="h-4 w-4" />
                        Change Photo
                    </Button>
                    {currentImage && (
                        <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="gap-2"
                            onClick={handleRemove}
                        >
                            <Trash2 className="h-4 w-4" />
                            Remove
                        </Button>
                    )}
                </div>
                <Input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                />
                <p className="text-[10px] text-slate-500">
                    Max size 150KB. Supported formats: JPG, PNG.
                </p>
            </div>

            <ImageCropper
                open={isCropperOpen}
                onOpenChange={setIsCropperOpen}
                imageSrc={tempImageSrc}
                onCropComplete={handleCropComplete}
            />
        </div>
    );
}
