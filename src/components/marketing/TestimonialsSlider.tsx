import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { AdminService, Testimonial } from '../../services/adminService';

interface TestimonialsSliderProps {
  className?: string;
}

export default function TestimonialsSlider({ className = '' }: TestimonialsSliderProps) {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    loadTestimonials();
  }, []);

  useEffect(() => {
    if (testimonials.length <= 1) return;

    const interval = setInterval(() => {
      if (isAutoPlaying) {
        setCurrentIndex((prev) => (prev + 1) % testimonials.length);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [testimonials.length, isAutoPlaying]);

  const loadTestimonials = async () => {
    try {
      const data = await AdminService.getTestimonials();
      const activeTestimonials = data.filter(testimonial => testimonial.is_active);
      setTestimonials(activeTestimonials);
    } catch (error) {
      console.error('Error loading testimonials:', error);
    }
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
    setIsAutoPlaying(false);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    setIsAutoPlaying(false);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    setIsAutoPlaying(false);
  };

  if (testimonials.length === 0) {
    return null;
  }

  const currentTestimonial = testimonials[currentIndex];

  return (
    <div className={`relative ${className}`}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            What Our Customers Say
          </h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={goToPrevious}
              className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              disabled={testimonials.length <= 1}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={goToNext}
              className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              disabled={testimonials.length <= 1}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex items-start space-x-4">
          {currentTestimonial.client_avatar_url ? (
            <img
              src={currentTestimonial.client_avatar_url}
              alt={currentTestimonial.client_name}
              className="w-12 h-12 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-medium text-lg">
                {currentTestimonial.client_name.charAt(0)}
              </span>
            </div>
          )}

          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < (currentTestimonial.rating || 0)
                        ? 'text-yellow-400 fill-current'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              {currentTestimonial.is_featured && (
                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                  Featured
                </span>
              )}
            </div>

            <blockquote className="text-gray-600 dark:text-gray-300 mb-3 italic">
              "{currentTestimonial.content}"
            </blockquote>

            <div>
              <p className="font-semibold text-gray-900 dark:text-white">
                {currentTestimonial.client_name}
              </p>
              {currentTestimonial.client_company && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {currentTestimonial.client_company}
                </p>
              )}
            </div>
          </div>
        </div>

        {testimonials.length > 1 && (
          <div className="flex items-center justify-center space-x-2 mt-4">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentIndex
                    ? 'bg-primary-600'
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

