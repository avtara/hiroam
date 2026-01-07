"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export type StoreHeroProps = {
  bannerImages?: string[];
};

export function StoreHero({ bannerImages = [] }: StoreHeroProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (bannerImages.length === 0) {
    return null;
  }

  const handlePrevious = () => {
    setCurrentIndex((prev) =>
      prev === 0 ? bannerImages.length - 1 : prev - 1,
    );
  };

  const handleNext = () => {
    setCurrentIndex((prev) =>
      prev === bannerImages.length - 1 ? 0 : prev + 1,
    );
  };

  return (
    <section className="w-full">
      <div className="relative group">
        {/* Main carousel container */}
        <div className="relative w-full overflow-hidden rounded-2xl aspect-[3/1]">
          <Image
            src={bannerImages[currentIndex]}
            alt={`Banner ${currentIndex + 1}`}
            fill
            className="object-cover transition-opacity duration-300"
            priority
          />
        </div>

        {/* Navigation buttons - only show if more than 1 image */}
        {bannerImages.length > 1 && (
          <>
            {/* Previous button */}
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/90 hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Previous banner"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>

            {/* Next button */}
            <Button
              variant="outline"
              size="icon"
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/90 hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Next banner"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>

            {/* Dots indicator */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {bannerImages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`h-2 rounded-full transition-all ${
                    index === currentIndex
                      ? "w-8 bg-white"
                      : "w-2 bg-white/50 hover:bg-white/75"
                  }`}
                  aria-label={`Go to banner ${index + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
