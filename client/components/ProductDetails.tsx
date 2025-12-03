import { useState } from "react";

interface ProductDetailsProps {
    productImage: string;
    productName: string;
    servingSize: string;
    healthStatus: "GOOD" | "MODERATE" | "POOR";
    country: string;
    expiry: string;
    calories: number;
    suggestions: Array<{
        image: string;
        title: string;
    }>;
    onClose: () => void;
    onAddToDiary: () => void;
}

export function ProductDetails({
    productImage,
    productName,
    servingSize,
    healthStatus,
    country,
    expiry,
    calories,
    suggestions,
    onClose,
    onAddToDiary,
}: ProductDetailsProps) {
    const healthColors = {
        GOOD: { bg: "#E5F5E4", text: "#4CAF50" },
        MODERATE: { bg: "#FFF3E0", text: "#FF9800" },
        POOR: { bg: "#FFEBEE", text: "#F44336" },
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="relative mx-auto flex w-full max-w-md flex-col overflow-hidden bg-gradient-to-b from-[#3A4B6B] to-[#2C3D5D] rounded-3xl shadow-2xl">
                <div className="relative z-10 flex h-full min-h-screen w-full flex-col p-6 pb-8 pt-12 text-white">
                    {/* Header */}
                    <header className="flex items-center justify-between">
                        <button
                            onClick={onClose}
                            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                        >
                            <span className="material-symbols-outlined text-xl">
                                arrow_back_ios_new
                            </span>
                        </button>
                        <h1 className="text-lg font-semibold">Details</h1>
                        <button className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                            <span className="material-symbols-outlined text-xl">
                                more_horiz
                            </span>
                        </button>
                    </header>

                    {/* Main Content */}
                    <main className="mt-6 flex flex-1 flex-col">
                        {/* Product Image */}
                        <div className="relative aspect-[4/3] w-full rounded-3xl bg-white shadow-[0_6px_20px_0_rgba(0,0,0,0.1)]">
                            <img
                                alt={productName}
                                className="h-full w-full rounded-3xl object-cover"
                                src={productImage}
                            />
                            {/* Health Status Badge */}
                            <div
                                className="absolute top-4 left-4 flex h-8 items-center justify-center rounded-full px-3 shadow-sm"
                                style={{ backgroundColor: healthColors[healthStatus].bg }}
                            >
                                <span
                                    className="font-semibold text-sm"
                                    style={{ color: healthColors[healthStatus].text }}
                                >
                                    {healthStatus}
                                </span>
                            </div>
                            {/* Info Card */}
                            <div className="absolute bottom-4 right-4 flex items-center gap-2 rounded-2xl bg-white/90 p-3 backdrop-blur-sm shadow-[0_4px_14px_0_rgba(255,255,255,0.05)]">
                                <div className="text-center">
                                    <p className="text-xs font-medium text-gray-500">Country</p>
                                    <p className="mt-1 font-bold text-sm text-gray-800">
                                        {country}
                                    </p>
                                </div>
                                <div className="h-8 w-px bg-gray-200"></div>
                                <div className="text-center">
                                    <p className="text-xs font-medium text-gray-500">Expiry</p>
                                    <p className="mt-1 font-bold text-sm text-gray-800">
                                        {expiry}
                                    </p>
                                </div>
                                <div className="h-8 w-px bg-gray-200"></div>
                                <div className="text-center">
                                    <p className="text-xs font-medium text-gray-500">Calories</p>
                                    <p className="mt-1 font-bold text-sm text-gray-800">
                                        {calories}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Product Name */}
                        <div className="mt-6">
                            <h2 className="text-3xl font-bold">{productName}</h2>
                            <p className="mt-2 text-base text-white/70">{servingSize}</p>
                        </div>

                        {/* Suggestions */}
                        <div className="mt-8">
                            <h3 className="text-lg font-semibold">Suggestions</h3>
                            <div className="mt-4 flex justify-between gap-4">
                                {suggestions.map((suggestion, index) => (
                                    <div
                                        key={index}
                                        className="flex flex-col items-center text-center"
                                    >
                                        <img
                                            alt={suggestion.title}
                                            className="h-20 w-20 rounded-2xl object-cover"
                                            src={suggestion.image}
                                        />
                                        <p className="mt-2 text-sm text-white/80">
                                            {suggestion.title}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </main>

                    {/* Footer */}
                    <footer className="mt-auto pt-8">
                        <button
                            onClick={onAddToDiary}
                            className="flex h-16 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#90CAF9] to-[#42A5F5] shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-shadow"
                        >
                            <span className="text-lg font-bold text-white">
                                Add to Diary
                            </span>
                        </button>
                    </footer>
                </div>
            </div>
        </div>
    );
}
